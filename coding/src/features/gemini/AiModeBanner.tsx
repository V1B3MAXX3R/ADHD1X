import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';

// The master switch for everything that uses Gemini. Off means the built-in tools only.
export const AiModeBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { settings, updateSettings } = useApp();
  const [showRules, setShowRules] = useState(!compact);
  const aiOn = settings.aiModeEnabled;

  return (
    <section
      aria-label="AI Mode"
      className="p-4 rounded-lg border border-border bg-surface text-text space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-sm">{aiOn ? 'AI Mode is on (uses Gemini)' : 'AI Mode is off (built-in tools only)'}</h2>
          <p className="text-xs text-muted mt-0.5">
            AI Mode is optional. The day plan, timer, grade math, quiz rules and starter templates work on this device
            whether it is on or off.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={showRules}
            onClick={() => setShowRules(!showRules)}
            className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-xs underline"
          >
            {showRules ? 'Hide AI rules' : 'Read the AI rules'}
          </button>
          <button
            type="button"
            aria-pressed={aiOn}
            onClick={() => void updateSettings({ aiModeEnabled: !aiOn })}
            className={`min-h-[44px] px-4 py-2 rounded font-bold text-sm ${
              aiOn ? 'bg-accent text-on-accent' : 'border-2 border-border bg-bg text-text'
            }`}
          >
            {aiOn ? 'Turn AI Mode off' : 'Turn AI Mode on'}
          </button>
        </div>
      </div>

      {showRules && (
        <div className="p-3 rounded border border-border bg-bg text-xs space-y-1.5 leading-relaxed">
          <p className="font-bold text-sm">AI rules</p>
          <ul className="list-disc list-inside space-y-1 text-muted">
            <li>
              <strong>Only when you tap:</strong> Gemini runs only when you press a button that says &ldquo;Uses
              Gemini&rdquo;, and every result is shown for you to review before anything is saved.
            </li>
            <li>
              <strong>Grades and notes stay private:</strong> your scores, grades, quiz answers and personal notes never
              leave this device and are never sent to Gemini.
            </li>
            <li>
              <strong>Free tier notice:</strong> on the free Gemini tier, Google may use what is sent to improve its
              products, and people may read it. Leave out personal or sensitive details.
            </li>
            <li>
              <strong>School tasks only:</strong> Gemini only helps with school planning. It never gives medical,
              medication, supplement or diet advice.
            </li>
            <li>
              <strong>You stay in charge:</strong> emails are drafts that you edit and send yourself. Anything Gemini
              suggests can be ignored.
            </li>
          </ul>
        </div>
      )}
    </section>
  );
};
