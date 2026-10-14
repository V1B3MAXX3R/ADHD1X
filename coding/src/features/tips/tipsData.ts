export type TipCategory = 'starting' | 'focus' | 'overwhelm' | 'time' | 'sensory';
export type EvidenceBadge = 'Tested in studies' | 'Students say this helps';

export interface StudyTip {
  id: string;
  category: TipCategory;
  title: string;
  body: string;
  badge: EvidenceBadge;
  sourceNote: string;
}

export const TIP_CATEGORIES: [TipCategory | 'all', string][] = [
  ['all', 'All'],
  ['starting', 'Starting'],
  ['focus', 'Focus'],
  ['overwhelm', 'Overwhelm'],
  ['time', 'Time'],
  ['sensory', 'Sensory load'],
];

const STUDENTS = 'From what students report. Not tested in a study yet.';

// Study, planning and environment only. No medication, supplement or diet claims (A71).
export const EVIDENCE_TIPS_LIBRARY: StudyTip[] = [
  {
    id: 'T01',
    category: 'starting',
    title: 'When-then plans',
    body: 'Try this and see if it works for you: link your first move to something you already do ("When I sit down with my coffee, I will open the lab file").',
    badge: 'Tested in studies',
    sourceNote: 'Gollwitzer & Sheeran 2006, a review of 94 studies',
  },
  {
    id: 'T02',
    category: 'starting',
    title: 'The 2-minute permission rule',
    body: 'Try this and see if it works for you: give yourself full permission to stop when the 2-minute starter timer ends. A small ask is easier to begin.',
    badge: 'Students say this helps',
    sourceNote: STUDENTS,
  },
  {
    id: 'T03',
    category: 'focus',
    title: 'Put the prompt inside your working document',
    body: 'Try this and see if it works for you: copy the assignment instructions to the top of your blank doc so switching tabs does not make you lose your place.',
    badge: 'Students say this helps',
    sourceNote: STUDENTS,
  },
  {
    id: 'T04',
    category: 'focus',
    title: 'Test yourself instead of re-reading',
    body: 'Try this and see if it works for you: close the page and write down 3 things you remember, then check what you missed.',
    badge: 'Tested in studies',
    sourceNote: 'Dunlosky et al. 2013, a review of learning techniques',
  },
  {
    id: 'T05',
    category: 'overwhelm',
    title: 'One task at a time on Today',
    body: 'Try this and see if it works for you: switch Today to "One task card" in Settings so you only see the next assignment.',
    badge: 'Students say this helps',
    sourceNote: STUDENTS,
  },
  {
    id: 'T06',
    category: 'overwhelm',
    title: 'Leave a one-line note before you stop',
    body: 'Try this and see if it works for you: when you tap Done for now, write one line in the "Where was I?" box ("next: fix router 2 IP"). Tomorrow you will not have to rebuild the whole picture.',
    badge: 'Students say this helps',
    sourceNote: STUDENTS,
  },
  {
    id: 'T07',
    category: 'time',
    title: 'Hide the ticking numbers',
    body: 'Try this and see if it works for you: if watching seconds count down feels stressful, switch the timer to the shrinking bar or hide it in Settings.',
    badge: 'Students say this helps',
    sourceNote: STUDENTS,
  },
  {
    id: 'T08',
    category: 'time',
    title: 'Spread big tasks over several days',
    body: 'Try this and see if it works for you: turn on "Schedule work 2 to 3 days early" so a big lab becomes several short sessions.',
    badge: 'Tested in studies',
    sourceNote: 'Cepeda et al. 2006, a review of 254 studies on spaced practice',
  },
  {
    id: 'T09',
    category: 'sensory',
    title: 'Turn down brightness and motion',
    body: 'Try this and see if it works for you: when colors or moving art feel loud, switch to the Low theme, turn on Dim and turn animations off.',
    badge: 'Students say this helps',
    sourceNote: STUDENTS,
  },
];
