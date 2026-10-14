import { AssignmentType } from '../../shared/data/schemas';

export const TEMPLATE_FIRST_MOVES: Record<
  AssignmentType,
  { firstMove: string; steps: string[] }[]
> = {
  essay: [
    {
      firstMove: 'Open a blank document, type your name and a working title at the top.',
      steps: [
        'Paste the essay prompt at the top of the page so you do not have to switch tabs.',
        'Write three short bullet points for the main ideas you want to cover.',
        'Turn the first bullet point into two plain sentences.',
      ],
    },
    {
      firstMove: 'Read just the first paragraph of the essay instructions and highlight the word count.',
      steps: [
        'List the required sources or readings at the bottom of your doc.',
        'Draft one rough topic sentence for your first section.',
      ],
    },
  ],
  reading: [
    {
      firstMove: 'Open the reading and read only the headings and the first two sentences.',
      steps: [
        'Read the next two paragraphs at a comfortable pace.',
        'Write down one short phrase about what that section covered.',
      ],
    },
  ],
  homework: [
    {
      firstMove: 'Open the homework page and read Question 1 without solving it yet.',
      steps: [
        'Write down what Question 1 is asking you to find.',
        'Complete just the first part of Question 1.',
      ],
    },
  ],
  quiz: [
    {
      firstMove: 'Open your class notes and read the last three headings to refresh your memory.',
      steps: [
        'Pick one key term and say what it means in plain words.',
        'Review two practice questions from this week.',
      ],
    },
  ],
  lab: [
    {
      firstMove: 'Open the lab instructions and check what software or file you need open first.',
      steps: [
        'Launch the tool or environment needed for Step 1.',
        'Complete and verify just Step 1 of the lab.',
      ],
    },
  ],
  discussion: [
    {
      firstMove: 'Read the discussion prompt and type one sentence giving your initial reaction.',
      steps: [
        'Add one example from the course reading to support your sentence.',
        'Read your two sentences once and post.',
      ],
    },
  ],
  exam: [
    {
      firstMove: 'List the chapters or topics covered on the exam on a blank page.',
      steps: [
        'Circle the one topic you want to review first for 5 minutes.',
        'Read the summary notes for that single topic.',
      ],
    },
  ],
  project: [
    {
      firstMove: 'Create a folder or document for the project and list the final deliverables.',
      steps: [
        'Pick the smallest deliverable on the list.',
        'Spend 2 minutes setting up the file for that first piece.',
      ],
    },
  ],
  other: [
    {
      firstMove: 'Open the assignment instructions and read the first two lines.',
      steps: [
        'Write down the very first thing you need to turn in.',
        'Do 2 minutes of setup for that item.',
      ],
    },
  ],
};

export function getTemplateFirstMove(type: AssignmentType, index = 0) {
  const list = TEMPLATE_FIRST_MOVES[type] ?? TEMPLATE_FIRST_MOVES.other;
  return list[index % list.length];
}

export const BUILT_IN_TIPS = [
  {
    id: 'tip-1',
    title: 'Shrink the starting line',
    body: 'Try this and see if it works for you: tell yourself you only have to open the file and type one line. Stopping after 2 minutes is completely fine.',
    badge: 'Tested in studies',
  },
  {
    id: 'tip-2',
    title: 'Put the instructions inside your work doc',
    body: 'Try this and see if it works for you: copy the assignment prompt into the top of your draft so you do not lose your place switching between browser tabs.',
    badge: 'Students say this helps',
  },
  {
    id: 'tip-3',
    title: 'Clear extra tabs and noise',
    body: 'Try this and see if it works for you: move the one tab you need into its own window and turn on Low theme if the screen feels busy.',
    badge: 'Students say this helps',
  },
];
