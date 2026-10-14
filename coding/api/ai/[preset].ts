import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { FirstMoveOutputSchema, SHARED_SYSTEM_INSTRUCTION, SyllabusOutputSchema } from '../../server/presets';
import { containsMedicalAdvice } from '../../server/safety';

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, reason: 'unavailable' });
  }

  const preset = String(req.query.preset ?? '');
  if (!['syllabus', 'firstMove'].includes(preset)) {
    return res.status(404).json({ ok: false, reason: 'unavailable' });
  }

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
    if (bucket.count > 20) {
      return res.status(429).json({ ok: false, reason: 'rate_limited' });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, reason: 'unavailable' });
  }

  const modelLite = process.env.GEMINI_MODEL_LITE || 'gemini-2.5-flash-lite';
  const ai = new GoogleGenAI({ apiKey });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};

    if (preset === 'syllabus') {
      const { courseName, today, text, fileBase64, mimeType } = body;
      if (fileBase64 && Buffer.byteLength(fileBase64, 'base64') > 4 * 1024 * 1024) {
        return res.status(413).json({ ok: false, reason: 'too_large' });
      }
      if (mimeType && !['application/pdf', 'text/plain', 'text/markdown'].includes(mimeType)) {
        return res.status(415).json({ ok: false, reason: 'unsupported_file' });
      }

      const prompt = `Extract assignments for course "${courseName ?? 'Course'}". Today's date is ${today ?? '2026-10-13'}. Return JSON with { "assignments": [{ "name", "type" ("discussion"|"reading"|"homework"|"quiz"|"lab"|"essay"|"exam"|"project"|"other"), "dueDate" ("YYYY-MM-DD", optional), "points" (optional), "percentOfGrade" (optional) }], "courseEndDate" (optional), "warnings": [] }. Never guess missing dates.`;

      const contents = fileBase64
        ? [{ inlineData: { data: fileBase64, mimeType: mimeType || 'application/pdf' } }, prompt]
        : `${prompt}\n\nSyllabus text:\n${String(text ?? '').slice(0, 100_000)}`;

      const response = await ai.models.generateContent({
        model: modelLite,
        contents,
        config: {
          systemInstruction: SHARED_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
        },
      });

      const rawJson = JSON.parse(response.text ?? '{}');
      const parsed = SyllabusOutputSchema.safeParse(rawJson);
      if (!parsed.success) {
        return res.status(422).json({ ok: false, reason: 'invalid_output' });
      }

      const totalPercent = parsed.data.assignments.reduce(
        (sum, a) => sum + (a.percentOfGrade ?? 0),
        0,
      );
      if (totalPercent > 100) {
        parsed.data.warnings.push(
          `Grade percentages add up to ${totalPercent}% (over 100%). Please double-check the weights.`,
        );
      }

      return res.status(200).json({ ok: true, data: parsed.data });
    }

    if (preset === 'firstMove') {
      const { title, courseName, taskType, major, sizeChoice, detailsText } = body;
      const stepCountHint =
        sizeChoice === 'bite' ? '3 to 5' : sizeChoice === 'half' ? '2' : '2 to 4';
      const prompt = `Assignment: "${title}" (${taskType}) for course "${courseName}". Student major: "${major || 'general'}". Breakdown size: ${sizeChoice}. Details: "${String(detailsText || '').slice(0, 10_000)}". Give JSON { "firstMove": "one tiny concrete action taking ~2 minutes (max 160 chars)", "steps": [${stepCountHint} short follow-up steps (max 120 chars each)] }.`;

      const response = await ai.models.generateContent({
        model: modelLite,
        contents: prompt,
        config: {
          systemInstruction: SHARED_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
        },
      });

      const rawJson = JSON.parse(response.text ?? '{}');
      const parsed = FirstMoveOutputSchema.safeParse(rawJson);
      if (!parsed.success) {
        return res.status(422).json({ ok: false, reason: 'invalid_output' });
      }

      const combinedText = [parsed.data.firstMove, ...parsed.data.steps].join(' ');
      if (containsMedicalAdvice(combinedText)) {
        return res.status(422).json({ ok: false, reason: 'unsafe_output' });
      }

      return res.status(200).json({ ok: true, data: parsed.data });
    }
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return res.status(504).json({ ok: false, reason: isAbort ? 'timeout' : 'unavailable' });
  } finally {
    clearTimeout(timer);
  }
}
