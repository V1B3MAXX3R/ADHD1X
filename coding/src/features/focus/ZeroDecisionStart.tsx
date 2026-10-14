import React, { useState } from 'react';
import { useApp, getCurrentBlockName } from '../../app/AppContext';
import { Assignment } from '../../shared/data/schemas';
import { getTemplateFirstMove } from '../helpMeStart/templates';

// One tap: the starter timer starts on the top task and the first move is shown. No questions.
export const ZeroDecisionStart: React.FC<{ topTask: Assignment | null }> = ({ topTask }) => {
  const { settings, startTimer, timer } = useApp();
  const [launched, setLaunched] = useState<{ taskId: string; move: string } | null>(null);

  if (!topTask) return null;

  const start = () => {
    const template = getTemplateFirstMove(topTask.type, 0);
    setLaunched({ taskId: topTask.id, move: template.firstMove });
    startTimer(topTask.id, settings.starterMinutes, getCurrentBlockName(settings));
  };

  return (
    <div className="space-y-2">
      {!timer.running && (
        <button
          type="button"
          onClick={start}
          className="min-h-[44px] px-5 py-2.5 rounded bg-accent text-on-accent font-bold"
        >
          Start now without choosing: {topTask.name} ({settings.starterMinutes}-minute timer)
        </button>
      )}
      {launched && timer.running && timer.assignmentId === launched.taskId && (
        <div role="status" className="p-4 rounded border-2 border-accent bg-surface space-y-1 text-sm">
          <span className="text-xs font-bold uppercase text-muted">Timer running. Your 2-minute first move:</span>
          <p className="font-bold text-base">&ldquo;{launched.move}&rdquo;</p>
        </div>
      )}
    </div>
  );
};
