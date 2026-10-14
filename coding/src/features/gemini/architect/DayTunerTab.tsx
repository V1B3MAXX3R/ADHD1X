import React, { useState } from 'react';
import { useApp } from '../../../app/AppContext';
import { useClock } from '../../../shared/clock/ClockContext';
import { BlockName } from '../../../shared/data/schemas';
import { buildDayTunerMoves } from '../geminiLogic';
import { useAiCall } from '../useAiCall';

interface DayProposal {
  summary: string;
  recommendedBlocks: BlockName[];
  orderedTaskIds: string[];
  recommendedStarterMinutes: number;
}

// Tune today's plan around how your day actually looks. A proposal only, until you tap Apply.
export const DayTunerTab: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { assignments, saveTodayPlanState, updateSettings } = useApp();
  const { today } = useClock();
  const { loading, notice, run } = useAiCall();
  const [prompt, setPrompt] = useState('');
  const [proposal, setProposal] = useState<DayProposal | null>(null);

  const active = assignments.filter((a) => a.status !== 'done' && !a.notNow);
  const names = new Map(active.map((a) => [a.id, a.name]));

  const propose = () =>
    run<DayProposal>(
      'aiDayTuner',
      {
        userContext: prompt,
        tasks: active.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          dueDate: t.dueDate,
          estimateMinutes: t.estimateMinutes,
        })),
      },
      setProposal,
    );

  const apply = async () => {
    if (!proposal) return;
    await saveTodayPlanState({
      date: today,
      blocks: proposal.recommendedBlocks,
      accepted: false,
      manualMoves: buildDayTunerMoves(proposal.orderedTaskIds, new Set(active.map((a) => a.id)), proposal.recommendedBlocks),
    });
    await updateSettings({ starterMinutes: proposal.recommendedStarterMinutes }, true);
    setProposal(null);
    onDone();
  };

  const shownTasks = proposal ? proposal.orderedTaskIds.filter((id) => names.has(id)).slice(0, 6) : [];

  return (
    <div className="p-4 rounded border border-border bg-bg space-y-3">
      <label htmlFor="day-tuner-input" className="block text-sm font-medium">
        How does your day look? For example: &ldquo;Low energy, only 90 minutes before work, want an easy warm-up first.&rdquo;
      </label>
      <input
        id="day-tuner-input"
        type="text"
        maxLength={500}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text text-sm"
      />
      <button
        type="button"
        disabled={!prompt.trim() || loading || active.length === 0}
        onClick={propose}
        className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium text-sm"
      >
        {loading ? 'Tuning...' : 'Suggest a plan for today (Uses Gemini)'}
      </button>
      {active.length === 0 && <p className="text-xs text-muted">Add an assignment first.</p>}
      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {proposal && (
        <div className="p-3 rounded border-2 border-accent bg-surface space-y-2 text-sm">
          <p className="font-bold">{proposal.summary}</p>
          <p className="text-xs text-muted">
            Blocks: {proposal.recommendedBlocks.join(', ')}. Starter timer: {proposal.recommendedStarterMinutes} min.
          </p>
          {shownTasks.length > 0 && (
            <ol className="list-decimal list-inside text-xs space-y-0.5">
              {shownTasks.map((id) => (
                <li key={id}>{names.get(id)}</li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => void apply()}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold text-sm"
            >
              Use this for today
            </button>
            <button
              type="button"
              onClick={() => setProposal(null)}
              className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-sm"
            >
              Keep my current plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
