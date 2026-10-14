const MEDICAL_ADVICE_PATTERNS = [
  /\b(adderall|ritalin|vyvanse|concerta|methylphenidate|amphetamine|strattera|atomoxetine|leucovorin|acetaminophen)\b/i,
  /\b(take\s+a?\s*supplement|omega-3|magnesium|l-tyrosine|neurofeedback|elimination\s+diet)\b/i,
  /\b(prescribe|dosage|medication\s+adjustment|medical\s+diagnosis)\b/i,
];

export const CLINICIAN_REDIRECT_LINE =
  'ADHD1X is a study planning tool and cannot give medical, medication, supplement, or diet advice. Please speak with a qualified clinician or your campus health service.';

export function containsMedicalAdvice(text: string): boolean {
  return MEDICAL_ADVICE_PATTERNS.some((re) => re.test(text));
}

// A short access code can be guessed, so the endpoint treats a code shorter than this as "not set up".
export const MIN_ACCESS_CODE_LENGTH = 16;
