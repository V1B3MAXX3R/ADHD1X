import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { getWhyOnNote } from '../../features/quiz/quizRules';
import { Settings } from '../data/schemas';
import { SpaceBackground } from '../space/SpaceBackground';
import { RewardDialog } from '../../features/voyage/RewardDialog';
import { SessionWrapUp } from '../../features/memory/SessionWrapUp';
import { ParkingLot } from '../../features/focus/ParkingLot';
import { ClockDisplay } from '../clock/ClockDisplay';
import { ClockNotices } from '../clock/ClockNotices';
import { ExportReminder } from '../../features/settings/ExportReminder';

export const WhyOnNote: React.FC<{
  settingKey: keyof Settings;
  defaultValue: unknown;
}> = ({ settingKey, defaultValue }) => {
  const { quizAnswers, settings, undoQuizSetting } = useApp();
  const note = getWhyOnNote(settingKey, quizAnswers, settings.manualOverrides);
  if (!note) return null;
  return (
    <p className="text-xs text-muted mt-1 flex items-center gap-2">
      <span>On because you said yes to: {note.label}</span>
      <button
        type="button"
        onClick={() => void undoQuizSetting(settingKey, defaultValue)}
        className="underline min-h-[24px] px-1 text-text"
      >
        Undo
      </button>
    </p>
  );
};

export const AppShell: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => {
  const { settings, updateSettings, storageBlocked, timer, pauseResumeTimer, stopTimer, extendTimer, assignments, blockChangePromptOpen, dismissBlockChangePrompt } = useApp();
  const [helpOpen, setHelpOpen] = useState(false);
  const [wrapUpOpen, setWrapUpOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const helpBtnRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [srTimerAnnouncement, setSrTimerAnnouncement] = useState('');

  useEffect(() => {
    document.title = `${title} — ADHD1X`;
    headingRef.current?.focus();
  }, [location.pathname, title]);

  useEffect(() => {
    if (timer.running && !timer.paused && timer.secondsRemaining === timer.totalSeconds) {
      setSrTimerAnnouncement('Timer started.');
    } else if (timer.running && timer.paused) {
      setSrTimerAnnouncement('Timer paused.');
    } else if (!timer.running && timer.secondsRemaining === 0) {
      setSrTimerAnnouncement('Timer finished.');
    }
  }, [timer.running, timer.paused, timer.secondsRemaining, timer.totalSeconds]);

  const activeTask = assignments.find((a) => a.id === timer.assignmentId);
  const isSpace = settings.interfaceStyle === 'space';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bg text-text relative">
      <SpaceBackground />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-accent focus:text-on-accent focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>

      <nav
        aria-label="Main navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 lg:static lg:w-56 lg:border-t-0 lg:border-r lg:min-h-screen flex lg:flex-col justify-around lg:justify-start p-2 gap-2"
      >
        <div className="hidden lg:block px-3 py-4 font-bold text-lg">
          {isSpace && <span aria-hidden="true">🚀 </span>}ADHD1X
        </div>
        <NavLink
          to="/today"
          className={({ isActive }) =>
            `min-h-[44px] min-w-[44px] px-3 py-2 rounded flex items-center font-medium ${
              isActive ? 'bg-accent text-on-accent' : 'text-text hover:bg-bg'
            }`
          }
        >
          Today
        </NavLink>
        <NavLink
          to="/assignments"
          className={({ isActive }) =>
            `min-h-[44px] min-w-[44px] px-3 py-2 rounded flex items-center font-medium ${
              isActive ? 'bg-accent text-on-accent' : 'text-text hover:bg-bg'
            }`
          }
        >
          Assignments
        </NavLink>
        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            `min-h-[44px] min-w-[44px] px-3 py-2 rounded flex items-center font-medium ${
              isActive ? 'bg-accent text-on-accent' : 'text-text hover:bg-bg'
            }`
          }
        >
          Calendar
        </NavLink>
        {!settings.voyageHidden && (
          <NavLink
            to="/voyage"
            className={({ isActive }) =>
              `min-h-[44px] min-w-[44px] px-3 py-2 rounded flex items-center font-medium ${
                isActive ? 'bg-accent text-on-accent' : 'text-text hover:bg-bg'
              }`
            }
          >
            {isSpace && <span aria-hidden="true">🪐&nbsp;</span>}
            {isSpace ? 'Voyage' : 'Progress'}
          </NavLink>
        )}
        <NavLink
          to="/settings/display"
          className={({ isActive }) =>
            `min-h-[44px] min-w-[44px] px-3 py-2 rounded flex items-center font-medium ${
              isActive || location.pathname.startsWith('/settings')
                ? 'bg-accent text-on-accent'
                : 'text-text hover:bg-bg'
            }`
          }
        >
          Settings
        </NavLink>
      </nav>

      <div className="flex-1 flex flex-col pb-36 lg:pb-24 relative z-10">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 bg-surface/90">
          <span className="font-bold lg:hidden">ADHD1X</span>
          <div className="ml-auto flex items-center gap-2">
            <ClockDisplay />
            {/* Changes the look only. It does not change any other setting (A57). */}
            <button
              type="button"
              aria-pressed={isSpace}
              onClick={() => void updateSettings({ interfaceStyle: isSpace ? 'regular' : 'space' })}
              className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text text-sm font-medium"
            >
              Space mode: {isSpace ? 'on' : 'off'}
            </button>
            <button
              ref={helpBtnRef}
              type="button"
              onClick={() => setHelpOpen(true)}
              className="min-h-[44px] min-w-[44px] px-4 py-2 rounded border border-border bg-bg text-text font-medium"
            >
              Help
            </button>
          </div>
        </header>

        {storageBlocked && (
          <div role="status" className="bg-surface border-b border-border px-4 py-2 text-sm">
            Data cannot be saved permanently in this private browser window, but you can keep using ADHD1X for this session.
          </div>
        )}

        <ClockNotices />
        <ExportReminder />

        {blockChangePromptOpen && (
          <div
            role="region"
            aria-label="Study block ended notice"
            className="m-4 p-4 rounded border-2 border-focus bg-surface text-text"
          >
            <p className="font-bold">Your study block just ended.</p>
            <p className="text-sm mt-1">
              You&apos;re still working on: <strong>{activeTask?.name ?? 'current task'}</strong> (timer keeps running).
            </p>
            <p className="text-sm text-muted mt-2">
              Switching to something lighter can give your brain a breather, so you finish the day still feeling productive. Your call.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <button
                type="button"
                onClick={dismissBlockChangePrompt}
                className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
              >
                Keep the same task
              </button>
              <button
                type="button"
                onClick={() => {
                  stopTimer();
                  navigate('/today');
                }}
                className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text font-medium"
              >
                Change it
              </button>
            </div>
          </div>
        )}

        <main id="main-content" className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold mb-4 outline-none"
          >
            {title}
          </h1>
          {children}
        </main>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {srTimerAnnouncement}
      </div>

      {(timer.running || timer.secondsRemaining === 0) && timer.assignmentId && (
        <aside
          aria-label="Study timer"
          className="fixed bottom-16 lg:bottom-0 left-0 lg:left-56 right-0 z-20 border-t border-border bg-surface px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium">{activeTask?.name ?? 'Task'}</span>
            {settings.timerDisplay === 'number' && (
              <span aria-hidden="true" className="font-mono px-2 py-1 rounded bg-bg border border-border">
                {Math.floor(timer.secondsRemaining / 60)}:
                {String(timer.secondsRemaining % 60).padStart(2, '0')}
              </span>
            )}
            {settings.timerDisplay === 'bar' && (
              <div
                aria-hidden="true"
                className="w-32 h-3 rounded bg-bg border border-border overflow-hidden"
              >
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.round((timer.secondsRemaining / Math.max(1, timer.totalSeconds)) * 100),
                    )}%`,
                  }}
                />
              </div>
            )}
            {settings.timerDisplay === 'hidden' && (
              <span className="text-xs text-muted">(timer hidden)</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {timer.running && (
              <button
                type="button"
                onClick={pauseResumeTimer}
                className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
              >
                {timer.paused ? 'Resume' : 'Pause'}
              </button>
            )}
            <ParkingLot />
            <button
              type="button"
              onClick={() => extendTimer(settings.starterMinutes)}
              className="min-h-[44px] px-3 py-1 rounded bg-accent text-on-accent font-medium"
            >
              Keep going
            </button>
            <button
              type="button"
              onClick={() => navigate(`/start/${timer.assignmentId}`)}
              className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
            >
              Next step
            </button>
            <button
              type="button"
              onClick={() => setWrapUpOpen(true)}
              className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
            >
              Done for now
            </button>
          </div>
        </aside>
      )}

      <RewardDialog />
      {wrapUpOpen && timer.assignmentId && <SessionWrapUp onClose={() => setWrapUpOpen(false)} />}

      {helpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-dialog-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setHelpOpen(false);
              helpBtnRef.current?.focus();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="max-w-md w-full rounded bg-surface p-6 text-text border border-border shadow-lg">
            <h2 id="help-dialog-title" className="text-xl font-bold mb-3">
              Help &amp; Support
            </h2>
            <ul className="space-y-2 mb-4">
              <li>
                <Link
                  to="/help"
                  onClick={() => setHelpOpen(false)}
                  className="underline block py-2 min-h-[44px]"
                >
                  Tips and how ADHD1X works
                </Link>
              </li>
              <li>
                <Link
                  to="/help/campus-support"
                  onClick={() => setHelpOpen(false)}
                  className="underline block py-2 min-h-[44px]"
                >
                  Campus disability &amp; accessibility support
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  onClick={() => setHelpOpen(false)}
                  className="underline block py-2 min-h-[44px]"
                >
                  Privacy &amp; what goes to Gemini
                </Link>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => {
                setHelpOpen(false);
                helpBtnRef.current?.focus();
              }}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
