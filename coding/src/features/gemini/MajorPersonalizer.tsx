import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { buildLocalMajorProposal, MajorProposal } from './majorPresets';
import { useAiCall } from './useAiCall';

// "Personalize for my major" (A38, A93). Suggests planner settings, a few starter moves and saved
// routines. Nothing is saved until you tap Apply.
export const MajorPersonalizer: React.FC<{ major: string; onApplied: () => void }> = ({ major, onApplied }) => {
  const { settings, updateSettings, cacheFirstMove } = useApp();
  const { loading, notice, setNotice, run } = useAiCall();
  const [proposal, setProposal] = useState<MajorProposal | null>(null);
  const [fromGemini, setFromGemini] = useState(false);

  const cleanMajor = major.trim();

  const start = () => {
    const useLocal = () => {
      setFromGemini(false);
      setProposal(buildLocalMajorProposal(cleanMajor));
    };
    if (!settings.aiModeEnabled) {
      useLocal();
      setNotice('Made with the built-in presets, because AI Mode is off.');
      return;
    }
    run<MajorProposal>(
      'majorProfile',
      { major: cleanMajor },
      (d) => {
        setFromGemini(true);
        setProposal({ ...d, savedRoutines: d.savedRoutines.map((r) => ({ ...r, id: crypto.randomUUID() })) });
      },
      useLocal,
    );
  };

  const apply = async () => {
    if (!proposal) return;
    const kept = settings.savedRoutines.filter((r) => !proposal.savedRoutines.some((n) => n.title === r.title));
    await updateSettings(
      {
        major: cleanMajor,
        majorWeighting: proposal.recommendedSettings.majorWeighting,
        spacingEarly: proposal.recommendedSettings.spacingEarly,
        heavyBlock: proposal.recommendedSettings.heavyBlock,
        savedRoutines: [...kept, ...proposal.savedRoutines].slice(-12),
      },
      false,
    );
    for (const move of proposal.starterMoves) {
      await cacheFirstMove({
        id: crypto.randomUUID(),
        taskType: move.taskType,
        sizeChoice: 'bite',
        firstMove: move.firstMove,
        steps: move.steps,
        source: fromGemini ? 'gemini' : 'template',
        createdAt: new Date().toISOString(),
      });
    }
    onApplied();
  };

  return (
    <section aria-labelledby="major-personalize-heading" className="p-4 rounded border border-border bg-bg space-y-3">
      <h2 id="major-personalize-heading" className="font-bold text-base">
        Personalize for my major
      </h2>
      <p className="text-xs text-muted">
        Suggests how to weight your major classes, a few starter moves and reusable routines. Only your major&apos;s name
        is sent to Gemini.
      </p>
      <button
        type="button"
        disabled={!cleanMajor || loading}
        onClick={start}
        className="min-h-[44px] px-5 py-2 rounded bg-accent text-on-accent font-bold disabled:opacity-50"
      >
        {loading
          ? 'Personalizing...'
          : settings.aiModeEnabled
            ? 'Personalize for my major (Uses Gemini)'
            : 'Personalize for my major (built-in)'}
      </button>
      {!cleanMajor && <p className="text-xs text-muted">Type your major above first.</p>}
      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {proposal && (
        <div className="p-4 rounded-lg border-2 border-accent bg-surface space-y-4 text-sm">
          <h3 className="text-base font-bold">Review for {cleanMajor}. Nothing is saved until you tap Apply.</h3>
          <p>{proposal.summary}</p>

          <div>
            <p className="font-bold">Planner settings</p>
            <ul className="list-disc list-inside text-muted">
              <li>Extra weight for major courses near deadlines: <strong>{proposal.recommendedSettings.majorWeighting ? 'Yes' : 'No'}</strong></li>
              <li>Start big work 2 to 3 days early: <strong>{proposal.recommendedSettings.spacingEarly ? 'Yes' : 'No'}</strong></li>
              <li>Main heavy-work block: <strong>{proposal.recommendedSettings.heavyBlock}</strong></li>
            </ul>
          </div>

          <div className="space-y-1">
            <p className="font-bold">Starter moves</p>
            {proposal.starterMoves.map((m, i) => (
              <p key={i} className="p-2 rounded border border-border bg-bg">
                <span className="text-xs font-bold uppercase text-accent">{m.taskType}:</span> &ldquo;{m.firstMove}&rdquo;
              </p>
            ))}
          </div>

          <div className="space-y-1">
            <p className="font-bold">Saved routines</p>
            {proposal.savedRoutines.map((r) => (
              <p key={r.id} className="p-2 rounded border border-border bg-bg">
                <strong>{r.title}</strong> ({r.taskType}): {r.steps.join(', then ')}
              </p>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void apply()}
              className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-bold"
            >
              Apply and continue
            </button>
            <button
              type="button"
              onClick={() => setProposal(null)}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
