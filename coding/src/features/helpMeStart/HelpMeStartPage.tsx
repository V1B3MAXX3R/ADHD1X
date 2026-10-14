import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../shared/components/AppShell';
import { useApp, getCurrentBlockName } from '../../app/AppContext';
import { getTemplateFirstMove, BUILT_IN_TIPS } from './templates';
import { callFirstMovePreset, getCalmErrorMessage, AiFailureReason } from '../../shared/ai/client';

export const HelpMeStartPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const {
    assignments,
    courses,
    settings,
    firstMoves,
    cacheFirstMove,
    upsertAssignment,
    startTimer,
    requestGeminiWithNotice,
  } = useApp();
  const navigate = useNavigate();

  const candidates = assignments.filter((a) => a.status !== 'done' && !a.notNow);
  const initialTask =
    assignments.find((a) => a.id === assignmentId) ?? candidates[0] ?? null;

  const [selectedTask, setSelectedTask] = useState(initialTask);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [sizeChoice, setSizeChoice] = useState<'bite' | 'half' | 'full'>(settings.defaultSize);
  const [detailsDraft, setDetailsDraft] = useState(selectedTask?.detailsText ?? '');
  const [firstMoveText, setFirstMoveText] = useState('');
  const [extraSteps, setExtraSteps] = useState<string[]>([]);
  const [showMoreSteps, setShowMoreSteps] = useState(false);
  const [loadingMove, setLoadingMove] = useState(false);
  const [moveNotice, setMoveNotice] = useState('');
  const [stuckOpen, setStuckOpen] = useState(false);
  const [switchGentleShown, setSwitchGentleShown] = useState(false);
  const [templateIdx, setTemplateIdx] = useState(0);

  if (!selectedTask) {
    return (
      <AppShell title="Help me start">
        <p>No active assignment found. Add an assignment first.</p>
      </AppShell>
    );
  }

  const courseName =
    courses.find((c) => c.id === selectedTask.courseId)?.name ?? 'General Course';

  const loadFirstMove = (forceFreshGemini = false) => {
    if (!forceFreshGemini) {
      const cached = firstMoves.find(
        (fm) =>
          fm.taskType === selectedTask.type &&
          fm.sizeChoice === sizeChoice &&
          fm.courseId === selectedTask.courseId,
      );
      if (cached) {
        setFirstMoveText(cached.firstMove);
        setExtraSteps(cached.steps);
        setStep(4);
        return;
      }
    }

    const fallback = getTemplateFirstMove(selectedTask.type, templateIdx);
    setTemplateIdx((i) => i + 1);

    requestGeminiWithNotice(async () => {
      setLoadingMove(true);
      setMoveNotice('');
      const res = await callFirstMovePreset({
        title: selectedTask.name,
        courseName,
        taskType: selectedTask.type,
        major: settings.major,
        sizeChoice,
        detailsText: detailsDraft || selectedTask.detailsText,
      });
      setLoadingMove(false);

      if (res.ok && res.data?.firstMove) {
        setFirstMoveText(res.data.firstMove);
        setExtraSteps(res.data.steps ?? []);
        await cacheFirstMove({
          id: crypto.randomUUID(),
          taskType: selectedTask.type,
          courseId: selectedTask.courseId,
          sizeChoice,
          firstMove: res.data.firstMove,
          steps: res.data.steps ?? [],
          source: 'gemini',
          createdAt: new Date().toISOString(),
        });
      } else {
        setMoveNotice(getCalmErrorMessage((res.reason as AiFailureReason) ?? 'unavailable'));
        setFirstMoveText(fallback.firstMove);
        setExtraSteps(fallback.steps);
      }
      setStep(4);
    });
  };

  return (
    <AppShell title={`Help me start (Step ${step} of 5)`}>
      <div className="space-y-6 bg-surface p-6 rounded border border-border">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">1. What first?</h2>
            <p>
              Pre-selected task: <strong>{selectedTask.name}</strong> ({courseName})
            </p>
            {candidates.length > 1 && (
              <div>
                <label htmlFor="pick-other" className="block text-sm font-medium mb-1">
                  Or pick something else:
                </label>
                <select
                  id="pick-other"
                  value={selectedTask.id}
                  onChange={(e) => {
                    const found = candidates.find((c) => c.id === e.target.value);
                    if (found) {
                      setSelectedTask(found);
                      setDetailsDraft(found.detailsText ?? '');
                    }
                  }}
                  className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                >
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (due {c.dueDate})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">2. How big?</h2>
            <fieldset className="space-y-2">
              <legend className="text-sm text-muted mb-2">
                Choose how you want to tackle {selectedTask.name}:
              </legend>
              {(
                [
                  ['bite', 'Bite-sized pieces'],
                  ['half', 'Split in half'],
                  ['full', 'The full thing'],
                ] as const
              ).map(([val, label]) => (
                <label key={val} className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                  <input
                    type="radio"
                    name="sizeChoice"
                    checked={sizeChoice === val}
                    onChange={() => setSizeChoice(val)}
                    className="w-5 h-5"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => (selectedTask.detailsText ? loadFirstMove(false) : setStep(3))}
                className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium"
              >
                Continue (Uses Gemini)
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">3. Assignment details (optional)</h2>
            <label htmlFor="hms-details" className="block text-sm font-medium">
              Paste or type the assignment instructions so your first move fits:
            </label>
            <textarea
              id="hms-details"
              rows={4}
              value={detailsDraft}
              onChange={(e) => setDetailsDraft(e.target.value)}
              className="w-full p-3 rounded border border-border bg-bg text-text"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loadingMove}
                onClick={async () => {
                  if (detailsDraft.trim()) {
                    const updated = { ...selectedTask, detailsText: detailsDraft.trim() };
                    setSelectedTask(updated);
                    await upsertAssignment(updated);
                  }
                  loadFirstMove(false);
                }}
                className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium"
              >
                {loadingMove ? 'Finding first move...' : 'Get my first move (Uses Gemini)'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">4. Your first move (about 2 minutes)</h2>
            {moveNotice && (
              <p role="status" className="text-xs text-muted">
                {moveNotice}
              </p>
            )}
            <div className="p-4 rounded border-2 border-accent bg-bg text-lg font-medium">
              &ldquo;{firstMoveText}&rdquo;
            </div>

            <div className="flex flex-wrap gap-3">
              {extraSteps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMoreSteps(!showMoreSteps)}
                  className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text text-sm"
                >
                  {showMoreSteps ? 'Hide extra steps' : 'Show more steps'}
                </button>
              )}
              <button
                type="button"
                disabled={loadingMove}
                onClick={() => loadFirstMove(true)}
                className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text text-sm"
              >
                Give me a different one (Uses Gemini)
              </button>
            </div>

            {showMoreSteps && (
              <ol className="list-decimal list-inside space-y-1 text-sm p-3 rounded bg-bg border border-border">
                {extraSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium"
                >
                  Continue
                </button>
              </div>
              <button
                type="button"
                onClick={() => setStuckOpen(!stuckOpen)}
                className="min-h-[44px] px-3 py-2 underline text-sm"
              >
                Still stuck?
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">5. When?</h2>
            <p className="text-sm text-muted">
              Starter timer length: {settings.starterMinutes} minutes. Stopping early is always fine.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    startTimer(
                      selectedTask.id,
                      settings.starterMinutes,
                      getCurrentBlockName(settings),
                    );
                    navigate('/today');
                  }}
                  className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-bold"
                >
                  Start now ({settings.starterMinutes}m timer)
                </button>
              </div>

              {Boolean(selectedTask.detailsText || detailsDraft.trim()) && (
                <button
                  type="button"
                  onClick={() => navigate('/today')}
                  className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text text-sm"
                >
                  Start later
                </button>
              )}
            </div>
          </div>
        )}

        {stuckOpen && (
          <div className="border-t border-border pt-4 space-y-4">
            <h3 className="font-bold">Tips for getting started (try this and see if it works for you)</h3>
            <ul className="space-y-2 text-sm">
              {BUILT_IN_TIPS.map((t) => (
                <li key={t.id} className="p-3 rounded border border-border bg-bg">
                  <strong>{t.title}:</strong> {t.body}{' '}
                  <span className="text-xs text-muted">[{t.badge}]</span>
                </li>
              ))}
            </ul>

            <div className="p-3 rounded border border-border bg-bg space-y-2">
              {!switchGentleShown && (
                <p className="text-sm">
                  If we finish <strong>{selectedTask.name}</strong> now, we don&apos;t have to worry about it anymore.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setSwitchGentleShown(true);
                  const nextOther = candidates.find((c) => c.id !== selectedTask.id);
                  if (nextOther) {
                    setSelectedTask(nextOther);
                    setStep(1);
                  } else {
                    navigate('/today');
                  }
                }}
                className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
              >
                Switch to another task
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
