import React, { useState } from 'react';
import { Assignment } from '../../../shared/data/schemas';
import { useAiCall } from '../useAiCall';

type RequestKind = 'clarify' | 'extension' | 'other';
type Tone = 'neutral' | 'formal' | 'friendly';

const KIND_LABEL: Record<RequestKind, string> = {
  clarify: 'Ask for clarification',
  extension: 'Ask for a short extension',
  other: 'Other question',
};

// "Message my professor" (A61, A92): a draft you edit and send yourself. Gemini never sends anything.
export const ProfEmailTool: React.FC<{
  assignment: Assignment;
  courseName: string;
  initialNote?: string;
}> = ({ assignment, courseName, initialNote = '' }) => {
  const { loading, notice, setNotice, run } = useAiCall();
  const [kind, setKind] = useState<RequestKind>('clarify');
  const [note, setNote] = useState(initialNote);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const builtInDraft = () => ({
    subject: `Question about ${assignment.name} (${courseName})`,
    body: `Hello Professor [Professor Name],\n\nI am writing about ${assignment.name}. ${
      note.trim() || 'Could you please clarify the requirements?'
    }\n\nThank you,\n[Your Name]`,
  });

  const makeDraft = (tone: Tone) =>
    run<{ subject: string; body: string }>(
      'profEmail',
      { assignmentName: assignment.name, courseName, requestKind: kind, userNote: note, tone },
      (d) => setDraft(d),
      () => setDraft(builtInDraft()),
    );

  return (
    <div className="p-3 rounded border-2 border-accent bg-surface space-y-3 text-sm">
      <h3 className="font-bold">Message my professor</h3>
      <p className="text-xs text-muted">Makes a draft. You edit it and send it yourself.</p>

      <div role="group" aria-label="What are you asking?" className="flex flex-wrap gap-2">
        {(Object.keys(KIND_LABEL) as RequestKind[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`min-h-[44px] px-3 py-1 rounded border ${
              kind === k ? 'bg-accent text-on-accent border-accent' : 'bg-bg border-border'
            }`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor={`email-note-${assignment.id}`} className="block text-xs font-medium mb-1">
          One line about what you need (leave out personal details)
        </label>
        <input
          id={`email-note-${assignment.id}`}
          type="text"
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => makeDraft('neutral')}
          className="min-h-[44px] px-3 py-1 rounded bg-accent text-on-accent font-bold"
        >
          {loading ? 'Drafting...' : 'Draft it (Uses Gemini)'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => makeDraft('formal')}
          className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg"
        >
          More formal
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => makeDraft('friendly')}
          className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg"
        >
          Friendlier
        </button>
        <button
          type="button"
          onClick={() => setDraft(builtInDraft())}
          className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg"
        >
          Use a built-in draft
        </button>
      </div>
      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {draft && (
        <div className="space-y-2">
          <div>
            <label htmlFor={`email-subject-${assignment.id}`} className="block text-xs font-medium mb-1">
              Subject
            </label>
            <input
              id={`email-subject-${assignment.id}`}
              type="text"
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              className="w-full min-h-[44px] px-2 py-1 rounded border border-border bg-bg font-bold"
            />
          </div>
          <div>
            <label htmlFor={`email-body-${assignment.id}`} className="block text-xs font-medium mb-1">
              Message
            </label>
            <textarea
              id={`email-body-${assignment.id}`}
              rows={6}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              className="w-full p-2 rounded border border-border bg-bg"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
                setCopied(true);
              } catch {
                setNotice('Could not copy. You can select the text and copy it yourself.');
              }
            }}
            className="min-h-[44px] px-4 py-1 rounded bg-accent text-on-accent font-bold"
          >
            Copy to clipboard
          </button>
          <p role="status" className="text-xs text-muted">
            {copied ? 'Copied. Fill in the [placeholders] before you send it.' : 'Fill in the [placeholders] before you send it.'}
          </p>
        </div>
      )}
    </div>
  );
};
