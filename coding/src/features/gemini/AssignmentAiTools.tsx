import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { Assignment } from '../../shared/data/schemas';
import { AskTool } from './tools/AskTool';
import { MakeItClearTool, SavedChecklist } from './tools/MakeItClearTool';
import { PreFlightTool } from './tools/PreFlightTool';
import { ProfEmailTool } from './tools/ProfEmailTool';

type Tool = 'clear' | 'email' | 'ask' | 'preFlight';

const TOOLS: [Tool, string][] = [
  ['clear', 'Make it clear'],
  ['email', 'Message my professor'],
  ['ask', 'Ask about this assignment'],
  ['preFlight', 'Check before handing in'],
];

// Gemini helpers inside an assignment's details panel. Each opens one tool at a time.
export const AssignmentAiTools: React.FC<{ assignment: Assignment; courseName: string }> = ({
  assignment,
  courseName,
}) => {
  const { settings } = useApp();
  const [active, setActive] = useState<Tool | null>(null);
  const [emailNote, setEmailNote] = useState('');

  return (
    <div className="pt-3 border-t border-border space-y-3">
      <SavedChecklist assignment={assignment} />

      {!settings.aiModeEnabled ? (
        <p className="text-xs text-muted">AI Mode is off. Turn it on in Settings, Privacy, to use the Gemini tools.</p>
      ) : (
        <>
          <div role="group" aria-label="Gemini tools for this assignment" className="flex flex-wrap gap-2">
            {TOOLS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-expanded={active === key}
                onClick={() => setActive(active === key ? null : key)}
                className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-xs font-medium"
              >
                {label}
              </button>
            ))}
          </div>

          {active === 'clear' && <MakeItClearTool assignment={assignment} />}
          {active === 'email' && (
            <ProfEmailTool key={emailNote} assignment={assignment} courseName={courseName} initialNote={emailNote} />
          )}
          {active === 'ask' && (
            <AskTool
              assignment={assignment}
              onDraftEmail={(question) => {
                setEmailNote(question);
                setActive('email');
              }}
            />
          )}
          {active === 'preFlight' && <PreFlightTool assignment={assignment} />}
        </>
      )}
    </div>
  );
};
