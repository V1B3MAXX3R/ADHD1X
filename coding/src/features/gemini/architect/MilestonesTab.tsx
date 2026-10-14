import React, { useState } from 'react';
import { useApp } from '../../../app/AppContext';
import { useClock } from '../../../shared/clock/ClockContext';
import { Milestone, sanitizeMilestones } from '../geminiLogic';
import { useAiCall } from '../useAiCall';

// Splits one big project or exam into dated milestones. You review them before anything is added.
export const MilestonesTab: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { assignments, upsertAssignment } = useApp();
  const { today } = useClock();
  const { loading, notice, setNotice, run } = useAiCall();
  const [selectedId, setSelectedId] = useState('');
  const [proposal, setProposal] = useState<Milestone[] | null>(null);
  const [hideOriginal, setHideOriginal] = useState(true);

  const active = assignments.filter((a) => a.status !== 'done' && !a.notNow && a.dueDate >= today);
  const parent = active.find((a) => a.id === selectedId) ?? active[0];

  const propose = () => {
    if (!parent) return;
    run<{ milestones: Milestone[] }>(
      'milestonePlanner',
      {
        assignmentName: parent.name,
        dueDate: parent.dueDate,
        today,
        detailsText: parent.detailsText,
        estimateMinutes: parent.estimateMinutes,
      },
      (d) => {
        const clean = sanitizeMilestones(d.milestones, today, parent.dueDate);
        if (clean.length < 2) setNotice('The dates Gemini suggested did not fit before the due date. Try again.');
        else setProposal(clean);
      },
    );
  };

  const add = async () => {
    if (!parent || !proposal) return;
    for (const m of proposal) {
      await upsertAssignment({
        id: crypto.randomUUID(),
        courseId: parent.courseId,
        name: `${parent.name}: ${m.title}`,
        type: parent.type,
        dueDate: m.dueDate,
        estimateMinutes: m.estimateMinutes,
        estimateSource: 'default',
        minutesLogged: 0,
        status: 'todo',
        notNow: false,
        addedLate: false,
        source: 'manual',
        createdAt: new Date().toISOString(),
      });
    }
    if (hideOriginal) await upsertAssignment({ ...parent, notNow: true });
    setProposal(null);
    onDone();
  };

  return (
    <div className="p-4 rounded border border-border bg-bg space-y-3">
      <label htmlFor="ms-task-select" className="block text-sm font-medium">
        Pick a project, lab, essay or exam to split into dated steps:
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          id="ms-task-select"
          value={parent?.id ?? ''}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setProposal(null);
          }}
          className="min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text text-sm"
        >
          {active.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (due {t.dueDate})
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!parent || loading}
          onClick={propose}
          className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium text-sm"
        >
          {loading ? 'Planning...' : 'Suggest milestones (Uses Gemini)'}
        </button>
      </div>
      {active.length === 0 && <p className="text-xs text-muted">No upcoming assignments to split.</p>}
      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {proposal && parent && (
        <div className="p-3 rounded border-2 border-accent bg-surface space-y-2 text-sm">
          <p className="font-bold">Review these steps before adding</p>
          <ul className="space-y-1 text-xs">
            {proposal.map((m, i) => (
              <li key={i} className="p-2 rounded bg-bg border border-border">
                <strong>{m.title}</strong>: target {m.dueDate} (about {m.estimateMinutes} min)
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-xs cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={hideOriginal}
              onChange={(e) => setHideOriginal(e.target.checked)}
              className="w-5 h-5"
            />
            Move the original &ldquo;{parent.name}&rdquo; to Not now, so the work is not counted twice
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void add()}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold text-sm"
            >
              Add these to my assignments
            </button>
            <button
              type="button"
              onClick={() => setProposal(null)}
              className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
