export interface AcademicPhrase {
  phrase: string;
  literalMeaning: string;
}

// Plain-language meanings of phrases that often show up in syllabi. These are common readings, not rules:
// the professor's own instructions always win.
export const ACADEMIC_PHRASES: AcademicPhrase[] = [
  {
    phrase: '"Read critically" or "Engage with the text"',
    literalMeaning:
      'You do not need to memorize every word. Read the headings, intro and conclusion, then write down one thing you agree with and one question it raised.',
  },
  {
    phrase: '"Office hours by appointment"',
    literalMeaning:
      'You are welcome to email the professor with two times you are free and ask for a short chat, on Zoom or in person.',
  },
  {
    phrase: '"Synthesize the sources" (not "summarize")',
    literalMeaning:
      'Instead of describing Source A in one paragraph and Source B in the next, put both in the same paragraph and say how they agree or disagree.',
  },
  {
    phrase: '"Participate actively in discussion"',
    literalMeaning:
      'Post one clear answer to the weekly prompt and reply to one classmate, adding an example from the reading.',
  },
  {
    phrase: '"Show your work" or "Document your configuration"',
    literalMeaning:
      'Include the steps, commands or screenshots you used, not just the final answer or finished file.',
  },
];

export function filterPhrases(query: string, list: AcademicPhrase[] = ACADEMIC_PHRASES): AcademicPhrase[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((p) => p.phrase.toLowerCase().includes(q) || p.literalMeaning.toLowerCase().includes(q));
}
