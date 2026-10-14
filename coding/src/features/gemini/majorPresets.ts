import { AssignmentType, SavedRoutine } from '../../shared/data/schemas';

export interface MajorProposal {
  summary: string;
  recommendedSettings: {
    majorWeighting: boolean;
    spacingEarly: boolean;
    heavyBlock: 'Morning' | 'Evening';
  };
  starterMoves: { taskType: AssignmentType; firstMove: string; steps: string[] }[];
  savedRoutines: SavedRoutine[];
}

const TECH_MAJOR =
  /\b(cyber\w*|cis|computer\w*|network\w*|information|it|software|data|programming|engineering|technology)\b/i;

// Built-in version used when AI Mode is off or Gemini cannot be reached.
export function buildLocalMajorProposal(majorName: string): MajorProposal {
  if (TECH_MAJOR.test(majorName)) {
    return {
      summary: `Built-in preset for ${majorName}: starts hands-on labs 2 to 3 days early, gives major courses extra weight near deadlines, and adds lab and quiz routines.`,
      recommendedSettings: { majorWeighting: true, spacingEarly: true, heavyBlock: 'Morning' },
      starterMoves: [
        {
          taskType: 'lab',
          firstMove: 'Open your virtual lab or simulator and check the requirements for step 1.',
          steps: [
            'Check the starting setup.',
            'Do and test just the first task.',
            'Take a screenshot or save your progress.',
          ],
        },
        {
          taskType: 'quiz',
          firstMove: 'Write down 3 key terms or commands from this module on a blank note.',
          steps: ['Skim the module summary.', 'Test yourself on 3 practice questions.'],
        },
      ],
      savedRoutines: [
        {
          id: crypto.randomUUID(),
          title: `${majorName} lab routine`,
          taskType: 'lab',
          steps: [
            'Read the setup instructions.',
            'Configure and verify part 1.',
            'Save the verification output.',
          ],
        },
        {
          id: crypto.randomUUID(),
          title: `${majorName} quiz prep`,
          taskType: 'quiz',
          steps: [
            'Scan key terms for 2 minutes.',
            'Answer 3 practice questions without notes.',
            'Review anything you missed once.',
          ],
        },
      ],
    };
  }

  return {
    summary: `Built-in preset for ${majorName}: gives major courses extra weight near deadlines, starts big projects 2 to 3 days early, and adds a reusable routine.`,
    recommendedSettings: { majorWeighting: true, spacingEarly: true, heavyBlock: 'Morning' },
    starterMoves: [
      {
        taskType: 'essay',
        firstMove: `Open a blank document and type a working title and 3 bullet points.`,
        steps: ['Paste the assignment prompt at the top.', 'Write two plain sentences for the first section.'],
      },
    ],
    savedRoutines: [
      {
        id: crypto.randomUUID(),
        title: `${majorName} assignment routine`,
        taskType: 'project',
        steps: [
          'Break the deliverables into a 3-item checklist.',
          'Work 15 minutes on the first one.',
          'Leave a one-line note on where to pick up next.',
        ],
      },
    ],
  };
}
