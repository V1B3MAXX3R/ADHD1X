import type { FunFact } from './funFacts';

// Extra facts about how studying works, added on request. They are NOT part of the 20 approved facts in
// funFacts.ts (A34, A77): check the sources before calling these approved. Shown only in Space style, like
// the others.
export const STUDY_SCIENCE_FUN_FACTS: FunFact[] = [
  {
    id: 'FF21',
    category: 'How brains and communication work',
    fact: 'Testing yourself with flashcards or practice questions usually builds stronger memory than re-reading the same chapter again.',
    source: 'Roediger & Karpicke 2006; Dunlosky et al. 2013 review',
  },
  {
    id: 'FF22',
    category: 'How brains and communication work',
    fact: 'Spreading study over several days helps you remember longer than cramming it all into one night.',
    source: 'Cepeda et al. 2006 review (254 studies)',
  },
  {
    id: 'FF23',
    category: 'How brains and communication work',
    fact: 'Writing down "When X happens, I will do Y" helps people follow through. A review of 94 studies found a medium to large effect.',
    source: 'Gollwitzer & Sheeran 2006 meta-analysis',
  },
  {
    id: 'FF24',
    category: 'How brains and communication work',
    fact: 'Almost everyone, students and professors alike, underestimates how long a big task will take. It is called the planning fallacy.',
    source: 'Buehler, Griffin & Ross 1994',
  },
  {
    id: 'FF25',
    category: 'How brains and communication work',
    fact: 'Explaining an idea out loud in plain words, as if teaching a friend, shows you what you have not understood yet.',
    source: 'Dunlosky et al. 2013 (self-explanation)',
  },
  {
    id: 'FF26',
    category: 'How brains and communication work',
    fact: 'Mixing two related kinds of problems in one session feels harder at the time, but it tends to improve test scores later.',
    source: 'Rohrer & Taylor 2007; Brunmair & Richter 2019 review',
  },
  {
    id: 'FF27',
    category: 'How brains and communication work',
    fact: 'Putting steps on paper or a checklist frees up your working memory, so your brain only has to handle one piece at a time.',
    source: 'Risko & Gilbert 2016 (cognitive offloading review)',
  },
  {
    id: 'FF28',
    category: 'How brains and communication work',
    fact: 'Short breaks during a long study stretch help keep your accuracy steady over an afternoon.',
    source: 'Albulescu et al. 2022 meta-analysis on micro-breaks',
  },
  {
    id: 'FF29',
    category: 'How brains and communication work',
    fact: 'Sleep after studying helps lock new facts and skills into long-term memory.',
    source: 'Rasch & Born 2013 review',
  },
];
