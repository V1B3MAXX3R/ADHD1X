import { getAccessCode, getSettings } from '../data/database';
import { AssignmentType } from '../data/schemas';
import type { PresetName } from '../../../server/presets';

export type AiFailureReason =
  | 'ai_disabled'
  | 'unauthorized'
  | 'too_large'
  | 'unsupported_file'
  | 'rate_limited'
  | 'timeout'
  | 'invalid_output'
  | 'unsafe_output'
  | 'unavailable';

export type AiResult<T> = { ok: true; data: T } | { ok: false; reason: AiFailureReason };

export function getCalmErrorMessage(reason: AiFailureReason): string {
  switch (reason) {
    case 'ai_disabled':
      return 'AI Mode is turned off, so the built-in tools are being used. You can turn it on in Settings, Privacy.';
    case 'unauthorized':
      return 'Your personal access code is missing or did not match. You can set it in Settings > Privacy, or continue with the built-in tools.';
    case 'too_large':
      return 'That is over the size limit. You can paste the text below or add things by hand.';
    case 'unsupported_file':
      return 'Only PDF or plain text files are supported. You can paste the text or add things by hand.';
    case 'rate_limited':
      return 'Gemini is taking a breather right now. We switched to the built-in option so you can keep going.';
    case 'timeout':
      return 'Gemini took longer than 20 seconds, so we switched to the built-in option.';
    default:
      return "We couldn't reach Gemini right now. You can use the built-in option or enter details by hand.";
  }
}

// The one way the browser talks to Gemini. It always goes through our server, never straight to Google,
// and does nothing at all when AI Mode is off. Callers decide exactly which fields to send: never grades,
// scores or personal notes (A36).
export async function callAiPreset<T = unknown>(
  preset: PresetName,
  payload: Record<string, unknown>,
): Promise<AiResult<T>> {
  try {
    const settings = await getSettings();
    if (!settings.aiModeEnabled) return { ok: false, reason: 'ai_disabled' };
  } catch {
    // If saved settings cannot be read, carry on: the server still checks the access code.
  }

  const accessCode = await getAccessCode();
  try {
    const res = await fetch(`/api/ai/${preset}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-code': accessCode,
      },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as AiResult<T>;
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export async function callSyllabusPreset(payload: {
  courseName: string;
  today: string;
  text?: string;
  fileBase64?: string;
  mimeType?: string;
}) {
  return callAiPreset<any>('syllabus', payload);
}

export async function callFirstMovePreset(payload: {
  title: string;
  courseName: string;
  taskType: AssignmentType;
  major?: string;
  sizeChoice: 'bite' | 'half' | 'full';
  detailsText?: string;
}) {
  return callAiPreset<any>('firstMove', payload);
}
