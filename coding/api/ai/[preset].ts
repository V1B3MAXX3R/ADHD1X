import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { ALL_PRESET_NAMES, PRESET_MODEL_TIER, PresetName, SHARED_SYSTEM_INSTRUCTION } from '../../server/presets';
import { buildPromptSpec } from '../../server/promptBuilders';
import { containsMedicalAdvice } from '../../server/safety';

// Best-effort rate limit per server instance (Technical Spec 3.5).
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 25;
const MAX_BODY_BYTES = 100 * 1024;

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
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

  // Access code check (Technical Spec 3.2).
  const expectedCode = process.env.ACCESS_CODE ?? '';
  const providedCode = String(req.headers['x-access-code'] ?? '');
  if (!expectedCode || !providedCode || !constantTimeEquals(providedCode, expectedCode)) {
    return res.status(401).json({ ok: false, reason: 'unauthorized' });
  }

  const now = Date.now();
  const bucket = rateBuckets.get(providedCode);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(providedCode, { count: 1, resetAt: now + 60_000 });
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
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as Record<string, unknown>;

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
