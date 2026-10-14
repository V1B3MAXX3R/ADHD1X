export interface FunFact {
  id: string;
  category: 'History' | 'How brains and communication work' | 'Myth busters' | 'People and community';
  fact: string;
  source: string;
}

// The 20 approved facts from research/evidence-report-proposals.md section 6 (A67, A77).
// Shown only in Space mode.
export const FUN_FACTS: FunFact[] = [
  {
    id: 'FF1',
    category: 'History',
    fact: 'Doctors were writing about attention problems back in the 1700s. Alexander Crichton described a "disease of attention" in 1798.',
    source: 'Martinez-Badía & Martinez-Raga 2015 [56]',
  },
  {
    id: 'FF2',
    category: 'History',
    fact: 'Autism was first described in a medical paper in 1943. The first child in it, Donald, grew up and lived into old age in Mississippi.',
    source: 'Kanner 1943 [55]; Donvan & Zucker 2010 via PBS [58]',
  },
  {
    id: 'FF3',
    category: 'History',
    fact: 'The term "ADHD" is younger than you might think. It first appeared in 1987.',
    source: 'Martinez-Badía & Martinez-Raga 2015 [56]',
  },
  {
    id: 'FF4',
    category: 'History',
    fact: 'The word "neurodiversity" spread in the late 1990s, shaped by autistic people talking online. Judy Singer\'s 1998 thesis made it famous.',
    source: 'The 19th 2024 [63]',
  },
  {
    id: 'FF5',
    category: 'History',
    fact: 'In 1993, autistic writer Jim Sinclair published "Don\'t Mourn for Us," one of the first essays where autistic people spoke for themselves.',
    source: 'Sinclair 1993 [60]',
  },
  {
    id: 'FF6',
    category: 'History',
    fact: 'Since 2013, doctors have been allowed to diagnose ADHD and autism together. Before that, the rules said pick one.',
    source: 'DSM-5 via Psych Central [1]',
  },
  {
    id: 'FF7',
    category: 'How brains and communication work',
    fact: 'In one experiment, stories passed along a chain of autistic people stayed just as accurate as in a chain of non-autistic people. Mixed chains lost the most detail. Communication styles matter on both sides.',
    source: 'Crompton et al. 2020 [49]',
  },
  {
    id: 'FF8',
    category: 'How brains and communication work',
    fact: '"Double empathy" is the idea that misunderstandings between different kinds of thinkers go both ways, not just one.',
    source: 'Milton 2012 [50]',
  },
  {
    id: 'FF9',
    category: 'How brains and communication work',
    fact: 'No brain scan can tell whether someone has ADHD. Average brain differences in big studies are tiny.',
    source: 'Hoogman et al. 2017 [34]',
  },
  {
    id: 'FF10',
    category: 'How brains and communication work',
    fact: 'Thousands of genes each play a tiny part in how attention works. There\'s no single "attention gene."',
    source: 'Demontis et al. 2023 [32]; Faraone & Larsson 2019 [20]',
  },
  {
    id: 'FF11',
    category: 'How brains and communication work',
    fact: 'Being the youngest in your class makes kids more likely to be labeled with attention problems, because a few months of age matters a lot when you\'re 6.',
    source: 'Whitely et al. 2019 [27]',
  },
  {
    id: 'FF12',
    category: 'Myth busters',
    fact: 'Vaccines don\'t cause autism. A study of over 650,000 Danish children found no link.',
    source: 'Hviid et al. 2019 [35]',
  },
  {
    id: 'FF13',
    category: 'Myth busters',
    fact: 'Autism was once blamed on "cold" parents. That idea was wrong and has been abandoned.',
    source: 'Lord et al. 2022 [4]; Bai et al. 2019 [31]',
  },
  {
    id: 'FF14',
    category: 'Myth busters',
    fact: 'When researchers checked who knew which kids got "brain training," most of the benefit disappeared. Good science checks for that.',
    source: 'Sonuga-Barke et al. 2013 [12]',
  },
  {
    id: 'FF15',
    category: 'Myth busters',
    fact: 'About half of the top #adhd TikTok videos in one study were misleading. Check where your tips come from.',
    source: 'Yeung et al. 2022 [52]',
  },
  {
    id: 'FF16',
    category: 'Myth busters',
    fact: 'Online "Am I autistic?" quizzes aren\'t diagnoses. Even the questionnaires clinics use miss lots of people.',
    source: 'Ashwood et al. 2016 [45]; Guthrie et al. 2019 [44]',
  },
  {
    id: 'FF17',
    category: 'People and community',
    fact: 'Lots of adults find out they\'re autistic or have ADHD later in life. It\'s common, not weird.',
    source: 'Long & Coats 2022 [29]; Young et al. 2020 [5]',
  },
  {
    id: 'FF18',
    category: 'People and community',
    fact: 'Many autistic adults prefer "autistic person," while many professionals say "person with autism." Asking someone what they prefer is always fine.',
    source: 'Kenny et al. 2016 [51]',
  },
  {
    id: 'FF19',
    category: 'People and community',
    fact: 'Women and girls are often recognized later, partly because they learn to hide their differences.',
    source: 'Hull et al. 2017 [47]; Young et al. 2020 [5]',
  },
  {
    id: 'FF20',
    category: 'People and community',
    fact: 'Colleges have disability services that can arrange things like extra time or a quieter exam room.',
    source: 'General campus practice; see T34',
  },
];

export function pickRandomFunFact(excludeId?: string): FunFact {
  const pool = excludeId ? FUN_FACTS.filter((f) => f.id !== excludeId) : FUN_FACTS;
  return pool[Math.floor(Math.random() * pool.length)] ?? FUN_FACTS[0];
}
