import type { ApiRequest as VercelRequest, ApiResponse as VercelResponse } from '../../server/apiTypes';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { ALL_PRESET_NAMES, PRESET_MODEL_TIER, PresetName, SHARED_SYSTEM_INSTRUCTION } from '../../server/presets';
import { buildPromptSpec } from '../../server/promptBuilders';
import { containsMedicalAdvice, MIN_ACCESS_CODE_LENGTH } from '../../server/safety';

// Best-effort limits per server instance (Technical Spec 3.5). A serverless host may run several instances
// that do not share this memory, so the real protection is a long random ACCESS_CODE (see SECURITY.md).
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 25;
const MAX_BODY_BYTES = 100 * 1024;

// Wrong-code guesses: too many from one address, or too many overall, and the endpoint stops answering for a while.
const failuresByClient = new Map<string, { count: number; resetAt: number }>();
const MAX_FAILED_PER_CLIENT = 8;
const MAX_FAILED_OVERALL = 60;
const FAILURE_WINDOW_MS = 15 * 60_000;
const OVERALL_KEY = '*';

const MAX_CODE_HEADER_LENGTH = 256;

const digest = (value: string): Buffer => crypto.createHash('sha256').update(value).digest();

// Compares fixed-length hashes, so neither the time taken nor the length of the real code is revealed.
function constantTimeEquals(a: string, b: string): boolean {
  return crypto.timingSafeEqual(digest(a), digest(b));
}

function firstHeader(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function clientKey(req: VercelRequest): string {
  const real = firstHeader(req.headers['x-real-ip']).trim();
  const forwarded = firstHeader(req.headers['x-forwarded-for']).split(',')[0].trim();
  const socket = req.socket?.remoteAddress ?? '';
  return real || forwarded || socket || 'unknown';
}

function tooManyFailures(key: string, limit: number, now: number): boolean {
  const entry = failuresByClient.get(key);
  return Boolean(entry && now <= entry.resetAt && entry.count >= limit);
}

function recordFailure(key: string, now: number): void {
  const entry = failuresByClient.get(key);
  if (!entry || now > entry.resetAt) failuresByClient.set(key, { count: 1, resetAt: now + FAILURE_WINDOW_MS });
  else entry.count += 1;
  if (failuresByClient.size > 5000) {
    for (const [k, v] of failuresByClient) if (now > v.resetAt) failuresByClient.delete(k);
  }
}

// A browser request from another website carries an Origin that does not match this site. Refuse those.
function isCrossSite(req: VercelRequest): boolean {
  const origin = firstHeader(req.headers.origin);
  if (!origin) return false;
  try {
    return new URL(origin).host !== firstHeader(req.headers.host);
  } catch {
    return true;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, reason: 'unavailable' });
  }

  const preset = String(req.query.preset ?? '') as PresetName;
  if (!ALL_PRESET_NAMES.includes(preset)) {
    return res.status(404).json({ ok: false, reason: 'unavailable' });
  }

  if (isCrossSite(req)) {
    return res.status(403).json({ ok: false, reason: 'unauthorized' });
  }

  // Access code check (Technical Spec 3.2). A code that is missing or too short to resist guessing is treated as
  // "not set up", so nothing is let through and the reply looks the same as a wrong code.
  const expectedCode = process.env.ACCESS_CODE ?? '';
  if (expectedCode.length < MIN_ACCESS_CODE_LENGTH) {
    return res.status(401).json({ ok: false, reason: 'unauthorized' });
  }

  const now = Date.now();
  const client = clientKey(req);
  if (tooManyFailures(client, MAX_FAILED_PER_CLIENT, now) || tooManyFailures(OVERALL_KEY, MAX_FAILED_OVERALL, now)) {
    return res.status(429).json({ ok: false, reason: 'rate_limited' });
  }

  const providedCode = firstHeader(req.headers['x-access-code']);
  if (
    !providedCode ||
    providedCode.length > MAX_CODE_HEADER_LENGTH ||
    !constantTimeEquals(providedCode, expectedCode)
  ) {
    recordFailure(client, now);
    recordFailure(OVERALL_KEY, now);
    return res.status(401).json({ ok: false, reason: 'unauthorized' });
  }
  failuresByClient.delete(client);

  const bucketKey = digest(providedCode).toString('hex');
  const bucket = rateBuckets.get(bucketKey);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + 60_000 });
  } else {
    bucket.count += 1;
    if (bucket.count > MAX_REQUESTS_PER_MINUTE) {
      return res.status(429).json({ ok: false, reason: 'rate_limited' });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, reason: 'unavailable' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (preset !== 'syllabus' && Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return res.status(413).json({ ok: false, reason: 'too_large' });
    }
    let body: Record<string, unknown>;
    try {
      body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as Record<string, unknown>;
    } catch {
      return res.status(400).json({ ok: false, reason: 'unavailable' });
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return res.status(400).json({ ok: false, reason: 'unavailable' });
    }

    const spec = buildPromptSpec(preset, body);
    if (!spec.ok) {
      return res.status(spec.status).json({ ok: false, reason: spec.reason });
    }

    const modelName =
      PRESET_MODEL_TIER[preset] === 'flash'
        ? process.env.GEMINI_MODEL_FLASH || 'gemini-2.5-flash'
        : process.env.GEMINI_MODEL_LITE || 'gemini-2.5-flash-lite';

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: spec.contents as string,
      config: {
        systemInstruction: SHARED_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        abortSignal: controller.signal,
      },
    });

    const parsed = spec.schema.safeParse(JSON.parse(response.text ?? '{}'));
    if (!parsed.success) {
      return res.status(422).json({ ok: false, reason: 'invalid_output' });
    }

    if (preset === 'syllabus') {
      const total = parsed.data.assignments.reduce(
        (sum: number, a: { percentOfGrade?: number }) => sum + (a.percentOfGrade ?? 0),
        0,
      );
      if (total > 100) {
        parsed.data.warnings.push(`Grade percentages add up to ${total}% (over 100%). Please double-check the weights.`);
      }
      return res.status(200).json({ ok: true, data: parsed.data });
    }

    // Safety scan on all other free-text output (A71).
    if (containsMedicalAdvice(JSON.stringify(parsed.data))) {
      return res.status(422).json({ ok: false, reason: 'unsafe_output' });
    }

    return res.status(200).json({ ok: true, data: parsed.data });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return res.status(504).json({ ok: false, reason: isAbort ? 'timeout' : 'unavailable' });
  } finally {
    clearTimeout(timer);
  }
}
