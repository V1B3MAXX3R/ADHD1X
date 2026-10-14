import React, { useState } from 'react';
import { Assignment } from '../../../shared/data/schemas';
import { useAiCall } from '../useAiCall';

// A short self-check to do just before handing something in, based only on the instructions.
export const PreFlightTool: React.FC<{ assignment: Assignment }> = ({ assignment }) => {
  const { loading, notice, setNotice, run } = useAiCall();
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const start = () => {
    if (!assignment.detailsText?.trim()) {
      setNotice('Add the assignment instructions first (Help me start, step 3), then try again.');
      return;
    }
    run<{ questions: string[] }>(
      'preFlightCheck',
      { assignmentName: assignment.name, detailsText: assignment.detailsText },
      (d) => {
        setQuestions(d.questions);
        setChecked(new Set());
      },
    );
  };

  return (
    <div className="p-3 rounded border-2 border-accent bg-surface space-y-2 text-sm">
      <h3 className="font-bold">Before you hand it in</h3>
      <p className="text-xs text-muted">A quick self-check made from the instructions. Nothing is saved.</p>
      <button
        type="button"
        disabled={loading}
        onClick={start}
        className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold"
      >
        {loading ? 'Making questions...' : 'Make my 3-question check (Uses Gemini)'}
      </button>
      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {questions && (
        <ul className="space-y-1">
          {questions.map((q, i) => (
            <li key={i}>
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={checked.has(i)}
                  onChange={(e) => {
                    const next = new Set(checked);
                    if (e.target.checked) next.add(i);
                    else next.delete(i);
                    setChecked(next);
                  }}
                  className="w-5 h-5"
                />
                <span>{q}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
