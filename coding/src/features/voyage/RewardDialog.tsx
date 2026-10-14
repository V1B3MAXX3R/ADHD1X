import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { FunFactCard } from './components/FunFactCard';

// Shown after finishing an assignment, only in Space style and only if Celebrations is on (A5, A24, A67).
export const RewardDialog: React.FC = () => {
  const { completionReward, dismissCompletionReward, nextRewardFunFact } = useApp();
  if (!completionReward) return null;
  const r = completionReward;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-dialog-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') dismissCompletionReward();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="max-w-lg w-full max-h-full overflow-y-auto rounded-lg bg-surface p-6 text-text border-2 border-accent shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-accent text-on-accent">
            Finished • +{r.pointsEarned} voyage point{r.pointsEarned === 1 ? '' : 's'}
          </span>
          <span className="text-sm text-muted">
            {r.progressPoints} of {r.totalPoints} points
          </span>
        </div>

        <h2 id="reward-dialog-title" className="text-xl font-bold">
          <span aria-hidden="true">🚀 </span>
          Your ship moved forward: {r.assignmentName}
        </h2>

        {r.newlyReachedStop ? (
          <div className="p-3 rounded border border-accent bg-bg">
            <p className="font-bold text-accent">New stop reached: {r.newlyReachedStop}</p>
            <p className="text-sm text-muted mt-1">
              Your crew is now orbiting {r.newlyReachedStop}. It is saved in your route.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Current stop: <strong>{r.currentStop}</strong>. Each finished assignment takes the ship farther out.
          </p>
        )}

        <FunFactCard fact={r.funFact} onAnother={nextRewardFunFact} />

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Link
            to="/voyage"
            onClick={dismissCompletionReward}
            className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text font-medium flex items-center"
          >
            See the voyage map
          </Link>
          <button
            type="button"
            autoFocus
            onClick={dismissCompletionReward}
            className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-bold"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
