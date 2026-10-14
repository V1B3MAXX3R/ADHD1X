import { getAccessCode } from '../data/database';
import { AssignmentType } from '../data/schemas';

export type AiFailureReason =
  | 'unauthorized'
  | 'too_large'
  | 'unsupported_file'
  | 'rate_limited'
  | 'timeout'
  | 'invalid_output'
  | 'unsafe_output'
  | 'unavailable';

export function getCalmErrorMessage(reason: AiFailureReason): string {
  switch (reason) {
    case 'unauthorized':
      return 'Your personal access code is missing or did not match. You can set it in Settings > Privacy, or continue by hand.';
    case 'too_large':
      return 'That file is over the 4 MB limit. You can paste the syllabus text below or add assignments by hand.';
    case 'unsupported_file':
      return 'Only PDF or plain text files are supported. You can paste the text or add assignments by hand.';
    case 'rate_limited':
      return 'Gemini is taking a breather right now. We switched to a built-in starter so you can keep going.';
    case 'timeout':
      return 'Gemini took longer than 20 seconds, so we switched to the built-in option.';
    default:
      return "We couldn't reach Gemini right now. You can use the built-in option or enter details by hand.";
  }
}

export async function callSyllabusPreset(payload: {
  courseName: string;
  today: string;
  text?: string;
  fileBase64?: string;
  mimeType?: string;
}) {
  const accessCode = await getAccessCode();
  try {
    const res = await fetch('/api/ai/syllabus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-code': accessCode,
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch {
    return { ok: false, reason: 'unavailable' as AiFailureReason };
  }
}

export async function callFirstMovePreset(payload: {
  title: string;
  courseName: string;
  taskType: AssignmentType;
  major?: string;
  sizeChoice: 'bite' | 'half' | 'full';
  detailsText?: string;
}) {
  const accessCode = await getAccessCode();
  try {
    const res = await fetch('/api/ai/firstMove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-code': accessCode,
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch {
    return { ok: false, reason: 'unavailable' as AiFailureReason };
  }
}
