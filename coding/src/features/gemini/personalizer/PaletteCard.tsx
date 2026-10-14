import React, { useState } from 'react';
import { useApp } from '../../../app/AppContext';
import { CustomPalette } from '../../../shared/data/schemas';
import { checkPalette, readableOn } from '../palette';
import { useAiCall } from '../useAiCall';

const SWATCHES = ['bg', 'surface', 'text', 'muted', 'accent', 'onAccent', 'focus', 'dueSoon', 'border'] as const;

// Custom color palette (optional). A palette can only be applied if every contrast check passes (A3).
export const PaletteCard: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const { loading, notice, run } = useAiCall();
  const [idea, setIdea] = useState('');
  const [proposal, setProposal] = useState<CustomPalette | null>(null);

  if (!settings.aiModeEnabled && !settings.customPalette) return null;

  const checks = proposal ? checkPalette(proposal) : [];
  const failing = checks.filter((c) => !c.pass);

  return (
    <section aria-labelledby="palette-heading" className="p-4 rounded border border-border bg-bg space-y-3">
      <h3 id="palette-heading" className="font-bold text-base">
        Custom color palette
      </h3>
      <p className="text-xs text-muted">
        Describe a color idea, like &ldquo;deep nebula&rdquo; or &ldquo;warm Mars sunset&rdquo;. A palette is used only if it
        passes every contrast check, so text stays easy to read.
      </p>

      {settings.customPalette && (
        <p className="text-sm flex flex-wrap items-center gap-2">
          <span>
            Using: <strong>{settings.customPalette.name}</strong>
          </span>
          <button
            type="button"
            onClick={() => void updateSettings({ customPalette: null }, true)}
            className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-sm"
          >
            Go back to the normal colors
          </button>
        </p>
      )}

      {settings.aiModeEnabled && (
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[12rem]">
            <label htmlFor="palette-idea" className="sr-only">
              Describe a color idea
            </label>
            <input
              id="palette-idea"
              type="text"
              maxLength={300}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe a color idea"
              className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text text-sm"
            />
          </div>
          <button
            type="button"
            disabled={!idea.trim() || loading}
            onClick={() => run<CustomPalette>('customPalette', { vibePrompt: idea }, setProposal)}
            className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium text-sm"
          >
            {loading ? 'Making colors...' : 'Make a palette (Uses Gemini)'}
          </button>
        </div>
      )}
      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {proposal && (
        <div className="p-4 rounded border-2 border-accent bg-surface space-y-3">
          <p className="font-bold text-sm">Preview: {proposal.name}</p>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((key) => (
              <span
                key={key}
                className="px-3 py-1 rounded border border-border text-xs font-mono"
                style={{ backgroundColor: proposal[key], color: readableOn(proposal[key]) }}
              >
                {key}: {proposal[key]}
              </span>
            ))}
          </div>
          <ul className="text-xs space-y-0.5">
            {checks.map((c) => (
              <li key={c.label}>
                {c.pass ? 'Passes' : 'Fails'}: {c.label} ({c.ratio}:1, needs {c.min}:1)
              </li>
            ))}
          </ul>
          {failing.length > 0 && (
            <p role="status" className="text-sm">
              This palette does not pass {failing.length} contrast check{failing.length === 1 ? '' : 's'}, so it can&apos;t be used.
              Try a different idea.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={failing.length > 0}
              onClick={async () => {
                await updateSettings({ customPalette: proposal }, true);
                setProposal(null);
              }}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold text-sm disabled:opacity-50"
            >
              Use this palette
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
    </section>
  );
};
