import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { cleanLine, MAX_NOTE_LENGTH } from './sessionMemory';

// The "Where was I?" note for one task, shown when the task comes up again (A62).
// Read-only with a Clear button by default; `editable` adds a field to write or change it.
export const LeftOffNote: React.FC<{ assignmentId: string; editable?: boolean }> = ({
  assignmentId,
  editable = false,
}) => {
  const { assignments, upsertAssignment } = useApp();
  const task = assignments.find((a) => a.id === assignmentId);
  const [draft, setDraft] = useState(task?.note ?? '');
  const [saved, setSaved] = useState('');
  if (!task) return null;

  const setNote = async (note: string | undefined) => {
    await upsertAssignment({ ...task, note });
  };

  if (!editable) {
    if (!task.note?.trim()) return null;
    return (
      <div className="p-3 rounded border border-accent bg-bg text-sm flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong>Where you left off:</strong> &ldquo;{task.note}&rdquo;
        </span>
        <button
          type="button"
          onClick={() => void setNote(undefined)}
          className="min-h-[44px] px-3 underline text-text"
        >
          Clear note
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={`note-${task.id}`} className="block text-sm font-medium">
        Where was I? (a line for next time)
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={`note-${task.id}`}
          type="text"
          maxLength={MAX_NOTE_LENGTH}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setSaved('');
          }}
          className="flex-1 min-w-[12rem] min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text"
        />
        <button
          type="button"
          onClick={async () => {
            await setNote(cleanLine(draft, MAX_NOTE_LENGTH));
            setSaved('Saved.');
          }}
          className="min-h-[44px] px-4 py-2 rounded border border-border bg-surface text-text font-medium"
        >
          Save note
        </button>
      </div>
      <p role="status" className="text-xs text-muted">
        {saved || 'Only you see this. It stays on this device and is never sent to Gemini.'}
      </p>
    </div>
  );
};
