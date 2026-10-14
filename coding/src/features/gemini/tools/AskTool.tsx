import React, { useState } from 'react';
import { Assignment } from '../../../shared/data/schemas';
import { useAiCall } from '../useAiCall';

// "Ask about this assignment" (A84): answers only from this assignment's own instructions.
export const AskTool: React.FC<{ assignment: Assignment; onDraftEmail: (question: string) => void }> = ({
  assignment,
  onDraftEmail,
}) => {
  const { loading, notice, setNotice, run } = useAiCall();
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<{ answer: string; foundInInstructions: boolean } | null>(null);

  const ask = () => {
    if (!question.trim()) return;
    if (!assignment.detailsText?.trim()) {
      setNotice('Add the assignment instructions first (Help me start, step 3), then ask.');
      return;
    }
    run<{ answer: string; foundInInstructions: boolean }>(
      'askAssignment',
      { assignmentName: assignment.name, detailsText: assignment.detailsText, question },
      setResult,
    );
  };

  return (
    <div className="p-3 rounded border-2 border-accent bg-surface space-y-2 text-sm">
      <h3 className="font-bold">Ask about this assignment</h3>
      <label htmlFor={`ask-${assignment.id}`} className="block text-xs text-muted">
        Ask a question. The answer uses only this assignment&apos;s instructions.
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={`ask-${assignment.id}`}
          type="text"
          maxLength={400}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="flex-1 min-w-[12rem] min-h-[44px] px-2 py-1 rounded border border-border bg-bg text-text"
        />
        <button
          type="button"
          disabled={!question.trim() || loading}
          onClick={ask}
          className="min-h-[44px] px-3 py-1 rounded bg-accent text-on-accent font-bold"
        >
          {loading ? 'Looking...' : 'Ask (Uses Gemini)'}
        </button>
      </div>
      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {result && (
        <div className="p-2 rounded bg-bg border border-border space-y-1">
          <p>{result.answer}</p>
          {!result.foundInInstructions && (
            <button type="button" onClick={() => onDraftEmail(question)} className="underline text-accent min-h-[44px]">
              The instructions do not say. Draft a quick email to ask your professor
            </button>
          )}
        </div>
      )}
    </div>
  );
};
