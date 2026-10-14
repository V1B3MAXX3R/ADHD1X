import React, { useState } from 'react';
import { useApp } from '../../../app/AppContext';
import { useAiCall } from '../useAiCall';

interface StrategyProposal {
  strategyName: string;
  summary: string;
  allocations: { courseName: string; percentOfStudyTime: number; focusTip: string }[];
  recommendedPrefs: { majorWeighting: boolean; spacingEarly: boolean };
}

// A weekly split of study time across your courses. Only course names and whether each is your major go out.
export const StrategyTab: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { settings, courses, assignments, updateSettings } = useApp();
  const { loading, notice, run } = useAiCall();
  const [proposal, setProposal] = useState<StrategyProposal | null>(null);
  const activeCount = assignments.filter((a) => a.status !== 'done' && !a.notNow).length;

  return (
    <div className="p-4 rounded border border-border bg-bg space-y-3">
      <p className="text-sm">
        Looks at your {courses.length} course{courses.length === 1 ? '' : 's'} and {activeCount} active task
        {activeCount === 1 ? '' : 's'} and suggests how to split your study time.
      </p>
      <button
        type="button"
        disabled={loading || courses.length === 0}
        onClick={() =>
          run<StrategyProposal>(
            'studyStrategy',
            {
              major: settings.major,
              courses: courses.map((c) => ({ name: c.name, isMajor: c.isMajor })),
              upcomingCount: activeCount,
            },
            setProposal,
          )
        }
        className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium text-sm"
      >
        {loading ? 'Building...' : 'Suggest a weekly split (Uses Gemini)'}
      </button>
      {courses.length === 0 && <p className="text-xs text-muted">Add a course first.</p>}
      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {proposal && (
        <div className="p-3 rounded border-2 border-accent bg-surface space-y-3 text-sm">
          <h4 className="font-bold">{proposal.strategyName}</h4>
          <p className="text-xs">{proposal.summary}</p>
          <ul className="space-y-1 text-xs">
            {proposal.allocations.map((al, i) => (
              <li key={i} className="p-2 rounded bg-bg border border-border">
                <strong>
                  {al.courseName} ({al.percentOfStudyTime}%):
                </strong>{' '}
                {al.focusTip}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            Applying turns on: {proposal.recommendedPrefs.majorWeighting ? 'extra weight for your major' : 'no extra weight for your major'},{' '}
            {proposal.recommendedPrefs.spacingEarly ? 'starting big work early' : 'no early starts'}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await updateSettings(proposal.recommendedPrefs, true);
                setProposal(null);
                onDone();
              }}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold text-sm"
            >
              Use these planning settings
            </button>
            <button
              type="button"
              onClick={() => setProposal(null)}
              className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
