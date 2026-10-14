import React, { useState } from 'react';
import { useApp } from '../../../app/AppContext';
import { Assignment, ChecklistItem } from '../../../shared/data/schemas';
import { useAiCall } from '../useAiCall';

const KIND_LABEL: Record<ChecklistItem['kind'], string> = {
  handIn: 'Hand in',
  format: 'Format',
  length: 'Length',
  dueDate: 'Due date',
  grading: 'Grading',
  other: 'Other',
};

// "Make it clear" (A60): instructions become a short checklist, reviewed before it is saved.
export const MakeItClearTool: React.FC<{ assignment: Assignment }> = ({ assignment }) => {
  const { upsertAssignment } = useApp();
  const { loading, notice, setNotice, run } = useAiCall();
  const [draft, setDraft] = useState<ChecklistItem[] | null>(null);

  const start = () => {
    if (!assignment.detailsText?.trim()) {
      setNotice('Add the assignment instructions first (Help me start, step 3), then try again.');
      return;
    }
    run<{ checklist: { kind: ChecklistItem['kind']; text: string }[] }>(
      'makeItClear',
      { detailsText: assignment.detailsText },
      (d) => setDraft(d.checklist.map((c) => ({ ...c, checked: false }))),
    );
  };

  return (
    <div className="p-3 rounded border-2 border-accent bg-surface space-y-3 text-sm">
      <h3 className="font-bold">Make it clear</h3>
      <p className="text-xs text-muted">Turns the instructions into a short checklist. You review it before it is saved.</p>
      <button
        type="button"
        disabled={loading}
        onClick={start}
        className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold"
      >
        {loading ? 'Reading the instructions...' : 'Make a checklist (Uses Gemini)'}
      </button>
      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {draft && (
        <div className="p-3 rounded border border-border bg-bg space-y-2">
          <p className="font-bold">Check this before saving</p>
          <ul className="space-y-1 text-xs">
            {draft.map((c, i) => (
              <li key={i}>
                <strong>{KIND_LABEL[c.kind]}:</strong> {c.text}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await upsertAssignment({ ...assignment, checklist: draft });
                setDraft(null);
              }}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold"
            >
              Save checklist to this assignment
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-surface"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// The saved checklist, shown on the assignment whether or not AI Mode is on.
export const SavedChecklist: React.FC<{ assignment: Assignment }> = ({ assignment }) => {
  const { upsertAssignment } = useApp();
  const items = assignment.checklist;
  if (!items || items.length === 0) return null;
  return (
    <div className="p-3 rounded border border-border bg-surface space-y-1">
      <h3 className="font-bold text-xs uppercase text-accent">Checklist</h3>
      {items.map((item, idx) => (
        <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) => {
              const next = [...items];
              next[idx] = { ...item, checked: e.target.checked };
              void upsertAssignment({ ...assignment, checklist: next });
            }}
            className="w-5 h-5"
          />
          <span>
            <strong>{KIND_LABEL[item.kind]}:</strong> {item.text}
          </span>
        </label>
      ))}
    </div>
  );
};
