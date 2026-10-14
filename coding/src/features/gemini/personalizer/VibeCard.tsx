import React, { useState } from 'react';
import { useApp } from '../../../app/AppContext';
import { Settings } from '../../../shared/data/schemas';
import { buildVibeFallback } from '../geminiLogic';
import { useAiCall } from '../useAiCall';

const LABELS: Partial<Record<keyof Settings, string>> = {
  interfaceStyle: 'Interface style',
  theme: 'Theme',
  dim: 'Dim mode',
  motion: 'Animations and motion',
  todayView: 'Today view',
  timerDisplay: 'Timer display',
  tone: 'Tone of messages',
  starterMinutes: 'Starter timer (minutes)',
  fewerOnScreen: 'Fewer things on screen',
};

const show = (v: unknown): string => (v === true ? 'On' : v === false ? 'Off' : String(v));

interface Proposal {
  explanation: string;
  settingsPatch: Partial<Settings>;
}

// "Describe how you work": suggests settings to review. Nothing changes until you tap Apply (A4).
export const VibeCard: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const { loading, notice, setNotice, run } = useAiCall();
  const [text, setText] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);

  const builtIn = () => {
    const patch = buildVibeFallback(text);
    setProposal(
      Object.keys(patch).length === 0
        ? null
        : { explanation: 'Built-in match based on the words you used:', settingsPatch: patch },
    );
    if (Object.keys(patch).length === 0) setNotice('Nothing in that description matched a setting. Try other words, or change settings by hand.');
  };

  const apply = async () => {
    if (!proposal) return;
    try {
      await updateSettings(proposal.settingsPatch, true);
      setProposal(null);
      setNotice('Settings applied. You can change any of them in Settings.');
    } catch {
      setNotice('One of those settings was not valid, so nothing was changed.');
    }
  };

  const entries = proposal ? Object.entries(proposal.settingsPatch).filter(([k]) => k in LABELS) : [];

  return (
    <section aria-labelledby="vibe-heading" className="p-4 rounded border border-border bg-bg space-y-3">
      <h3 id="vibe-heading" className="font-bold text-base">
        Describe how you work
      </h3>
      <div>
        <label htmlFor="vibe-text" className="block text-sm font-medium mb-1">
          For example: &ldquo;Bright screens hurt my eyes, countdown numbers stress me out, I like space, and keep messages short.&rdquo;
        </label>
        <textarea
          id="vibe-text"
          rows={2}
          maxLength={600}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-3 rounded border border-border bg-surface text-text text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {settings.aiModeEnabled && (
          <button
            type="button"
            disabled={!text.trim() || loading}
            onClick={() =>
              run<Proposal>('vibePersonalizer', { userPrompt: text }, setProposal, () => builtIn())
            }
            className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium text-sm"
          >
            {loading ? 'Thinking...' : 'Suggest settings (Uses Gemini)'}
          </button>
        )}
        <button
          type="button"
          disabled={!text.trim()}
          onClick={builtIn}
          className="min-h-[44px] px-4 py-2 rounded border border-border bg-surface text-sm"
        >
          Suggest settings (built-in)
        </button>
      </div>
      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {proposal && entries.length > 0 && (
        <div className="p-4 rounded border-2 border-accent bg-surface space-y-3">
          <p className="font-bold text-sm">{proposal.explanation}</p>
          <ul className="text-sm space-y-1">
            {entries.map(([key, value]) => (
              <li key={key}>
                <strong>{LABELS[key as keyof Settings]}:</strong> {show(value)}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void apply()}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold text-sm"
            >
              Apply these settings
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
