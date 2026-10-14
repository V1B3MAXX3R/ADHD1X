import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Assignment,
  CalendarItem,
  Course,
  FirstMoveRecord,
  QuizAnswerRecord,
  Settings,
  SettingsSchema,
  StudyDay,
} from '../shared/data/schemas';
import {
  clearCalendarItems,
  getAssignments,
  getCalendarItems,
  getCourses,
  getFirstMoves,
  getQuizAnswers,
  getSettings,
  getSession,
  getStudyDay,
  saveAssignment,
  saveCalendarItems,
  saveCourse,
  saveFirstMove,
  saveQuizAnswer,
  saveSession,
  saveSettings,
  saveStudyDay,
} from '../shared/data/database';
import { cleanLine, MAX_GOAL_LENGTH, minutesWorked, SessionOutcome } from '../features/memory/sessionMemory';
import { applyQuizAnswersToSettings } from '../features/quiz/quizRules';
import { blockAt, formatLocalDate, minutesOfDay } from '../shared/clock/clockLogic';
import { applyCustomPalette } from '../features/gemini/palette';
import { pickRandomFunFact } from '../features/voyage/funFacts';
import { buildCompletionReward, CompletionReward } from '../features/voyage/rewards';

interface TimerState {
  running: boolean;
  paused: boolean;
  assignmentId: string | null;
  secondsRemaining: number;
  totalSeconds: number;
  startedInBlock: string | null;
  sessionId: string | null; // the saved session this timer belongs to (A91)
  goalText: string | null; // the optional one-line goal for this session
  workedSeconds: number; // time from earlier "Keep going" rounds in the same session
}

interface AppContextValue {
  ready: boolean;
  storageBlocked: boolean;
  settings: Settings;
  quizAnswers: QuizAnswerRecord[];
  courses: Course[];
  assignments: Assignment[];
  firstMoves: FirstMoveRecord[];
  calendarItems: CalendarItem[];
  todayStudyDay: StudyDay | null;
  timer: TimerState;
  blockChangePromptOpen: boolean;
  completionReward: CompletionReward | null;
  dismissCompletionReward: () => void;
  nextRewardFunFact: () => void;
  completeAssignmentWithReward: (assignment: Assignment) => Promise<void>;
  dismissBlockChangePrompt: () => void;
  updateSettings: (patch: Partial<Settings>, isManual?: boolean) => Promise<void>;
  recordQuizAnswer: (questionId: number, answer: 'yes' | 'no' | 'skipped') => Promise<void>;
  undoQuizSetting: (settingKey: keyof Settings, defaultValue: unknown) => Promise<void>;
  upsertCourse: (c: Course) => Promise<void>;
  upsertAssignment: (a: Assignment) => Promise<void>;
  saveCalendarBatch: (items: CalendarItem[]) => Promise<void>;
  removeAllCalendarItems: () => Promise<void>;
  saveTodayPlanState: (day: StudyDay) => Promise<void>;
  cacheFirstMove: (fm: FirstMoveRecord) => Promise<void>;
  startTimer: (assignmentId: string, minutes: number, currentBlock: string | null, goalText?: string) => void;
  extendTimer: (minutes: number) => void;
  pauseResumeTimer: () => void;
  stopTimer: () => void;
  // Ends the session. `outcome` answers "done, partly, or not yet?" (A91). `note` is the "Where was I?"
  // line (A62): a string saves it, null clears it, leaving it out keeps what was there.
  finishSession: (result: { outcome?: SessionOutcome; note?: string | null; minutes?: number }) => Promise<void>;
  reloadAll: () => Promise<void>;
  requestGeminiWithNotice: (action: () => void) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// One-off readers for event handlers and starting values. Screens that must stay current as time
// passes use useClock() instead.
export function getTodayDateString(): string {
  return formatLocalDate(new Date());
}

export function getCurrentBlockName(settings: Settings): string | null {
  return blockAt(settings.blockWindows, minutesOfDay(new Date()));
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => SettingsSchema.parse({}));
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswerRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [firstMoves, setFirstMoves] = useState<FirstMoveRecord[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [todayStudyDay, setTodayStudyDay] = useState<StudyDay | null>(null);
  const [pendingGeminiAction, setPendingGeminiAction] = useState<(() => void) | null>(null);
  const [blockChangePromptOpen, setBlockChangePromptOpen] = useState(false);
  const [completionReward, setCompletionReward] = useState<CompletionReward | null>(null);

  const [timer, setTimer] = useState<TimerState>(() => {
    const saved = sessionStorage.getItem('adhd1x_timer');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      running: false,
      paused: false,
      assignmentId: null,
      secondsRemaining: 120,
      totalSeconds: 120,
      startedInBlock: null,
      sessionId: null,
      goalText: null,
      workedSeconds: 0,
    };
  });

  const reloadAll = async () => {
    try {
      const [s, q, c, a, fm, sd, cal] = await Promise.all([
        getSettings(),
        getQuizAnswers(),
        getCourses(),
        getAssignments(),
        getFirstMoves(),
        getStudyDay(getTodayDateString()),
        getCalendarItems(),
      ]);
      setSettings(s);
      setQuizAnswers(q);
      setCourses(c);
      setAssignments(a);
      setFirstMoves(fm);
      setCalendarItems(cal);
      setTodayStudyDay(sd ?? null);
    } catch {
      setStorageBlocked(true);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    void reloadAll();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-style', settings.interfaceStyle);
    root.setAttribute('data-dim', settings.dim ? 'on' : 'off');
    root.setAttribute('data-motion', settings.motion ? 'on' : 'off');
    root.setAttribute('data-spacing', settings.spacing);
    root.setAttribute('data-look', settings.cosmosLook ? 'cosmos' : 'normal');
    root.style.fontSize = `${settings.textScale}%`;
    applyCustomPalette(settings.customPalette);
  }, [settings]);

  useEffect(() => {
    sessionStorage.setItem('adhd1x_timer', JSON.stringify(timer));
    if (!timer.running || timer.paused) return;

    const interval = window.setInterval(() => {
      setTimer((prev) => {
        if (!prev.running || prev.paused) return prev;
        const currentBlock = getCurrentBlockName(settings);
        if (prev.startedInBlock && currentBlock !== prev.startedInBlock) {
          setBlockChangePromptOpen(true);
        }
        if (prev.secondsRemaining <= 1) {
          return { ...prev, running: false, secondsRemaining: 0 };
        }
        return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timer, settings]);

  const updateSettings = async (patch: Partial<Settings>, isManual = true) => {
    const manualOverrides = isManual
      ? Array.from(new Set([...settings.manualOverrides, ...Object.keys(patch)]))
      : settings.manualOverrides;
    const next = SettingsSchema.parse({ ...settings, ...patch, manualOverrides });
    setSettings(next);
    if (!storageBlocked) await saveSettings(next);
  };

  const recordQuizAnswer = async (questionId: number, answer: 'yes' | 'no' | 'skipped') => {
    const rec: QuizAnswerRecord = {
      questionId,
      answer,
      answeredAt: new Date().toISOString(),
    };
    const nextList = [...quizAnswers.filter((q) => q.questionId !== questionId), rec];
    setQuizAnswers(nextList);
    if (!storageBlocked) await saveQuizAnswer(rec);
    const updatedSettings = applyQuizAnswersToSettings(settings, nextList);
    setSettings(updatedSettings);
    if (!storageBlocked) await saveSettings(updatedSettings);
  };

  const undoQuizSetting = async (settingKey: keyof Settings, defaultValue: unknown) => {
    const next = SettingsSchema.parse({
      ...settings,
      [settingKey]: defaultValue,
      manualOverrides: Array.from(new Set([...settings.manualOverrides, settingKey])),
    });
    setSettings(next);
    if (!storageBlocked) await saveSettings(next);
  };

  const upsertCourse = async (c: Course) => {
    setCourses((prev) => [...prev.filter((x) => x.id !== c.id), c]);
    if (!storageBlocked) await saveCourse(c);
  };

  const upsertAssignment = async (a: Assignment) => {
    setAssignments((prev) => [...prev.filter((x) => x.id !== a.id), a]);
    if (!storageBlocked) await saveAssignment(a);
  };

  // Marks an assignment finished. In Space style with Celebrations on, also shows the reward (A5, A24, A67).
  const completeAssignmentWithReward = async (assignment: Assignment) => {
    const updated: Assignment = { ...assignment, status: 'done', completedAt: new Date().toISOString() };
    const before = assignments;
    const after = [...assignments.filter((x) => x.id !== assignment.id), updated];
    setAssignments(after);
    if (!storageBlocked) await saveAssignment(updated);

    if (assignment.status !== 'done' && settings.interfaceStyle === 'space' && settings.celebrations) {
      setCompletionReward(buildCompletionReward(before, after, updated, pickRandomFunFact()));
    }
  };

  const saveCalendarBatch = async (items: CalendarItem[]) => {
    setCalendarItems((prev) => {
      const ids = new Set(items.map((i) => i.id));
      return [...prev.filter((x) => !ids.has(x.id)), ...items];
    });
    if (!storageBlocked) await saveCalendarItems(items);
  };

  const removeAllCalendarItems = async () => {
    setCalendarItems([]);
    if (!storageBlocked) await clearCalendarItems();
  };

  const saveTodayPlanState = async (day: StudyDay) => {
    setTodayStudyDay(day);
    if (!storageBlocked) await saveStudyDay(day);
  };

  const cacheFirstMove = async (fm: FirstMoveRecord) => {
    setFirstMoves((prev) => [...prev.filter((x) => x.id !== fm.id), fm]);
    if (!storageBlocked) await saveFirstMove(fm);
  };

  const startTimer = (
    assignmentId: string,
    minutes: number,
    currentBlock: string | null,
    goalText?: string,
  ) => {
    const goal = goalText ? cleanLine(goalText, MAX_GOAL_LENGTH) : undefined;
    const sessionId = crypto.randomUUID();
    setTimer({
      running: true,
      paused: false,
      assignmentId,
      secondsRemaining: minutes * 60,
      totalSeconds: minutes * 60,
      startedInBlock: currentBlock,
      sessionId,
      goalText: goal ?? null,
      workedSeconds: 0,
    });
    if (!storageBlocked) {
      void saveSession({
        id: sessionId,
        assignmentId,
        startedAt: new Date().toISOString(),
        plannedMinutes: Math.max(1, Math.round(minutes)),
        goalText: goal,
      });
    }
  };

  // "Keep going": another round in the same session, so the goal and the time worked carry over.
  const extendTimer = (minutes: number) => {
    setTimer((prev) =>
      prev.assignmentId
        ? {
            ...prev,
            running: true,
            paused: false,
            workedSeconds: (prev.workedSeconds ?? 0) + Math.max(0, prev.totalSeconds - prev.secondsRemaining),
            secondsRemaining: minutes * 60,
            totalSeconds: minutes * 60,
          }
        : prev,
    );
  };

  const pauseResumeTimer = () => {
    setTimer((prev) => ({ ...prev, paused: !prev.paused }));
  };

  const stopTimer = () => {
    setTimer((prev) => ({
      ...prev,
      running: false,
      paused: false,
      assignmentId: null, // also hides the timer bar after it has run out
      sessionId: null,
      goalText: null,
      workedSeconds: 0,
    }));
    setBlockChangePromptOpen(false);
  };

  const finishSession = async (result: { outcome?: SessionOutcome; note?: string | null; minutes?: number }) => {
    const t = timer;
    // The person can correct the time. It is only used to improve future estimates, never shown as a score (A90).
    const minutes = Math.max(
      0,
      result.minutes ?? minutesWorked(t.workedSeconds ?? 0, t.totalSeconds, t.secondsRemaining),
    );
    if (t.sessionId && !storageBlocked) {
      const record = await getSession(t.sessionId);
      if (record) {
        await saveSession({
          ...record,
          actualMinutes: minutes,
          outcome: result.outcome ?? record.outcome,
        });
      }
    }
    const task = t.assignmentId ? assignments.find((x) => x.id === t.assignmentId) : undefined;
    if (task && (result.note !== undefined || (result.minutes !== undefined && minutes > 0))) {
      await upsertAssignment({
        ...task,
        note: result.note !== undefined ? (result.note ?? undefined) : task.note,
        minutesLogged: result.minutes !== undefined ? (task.minutesLogged ?? 0) + minutes : task.minutesLogged,
      });
    }
    stopTimer();
  };

  const requestGeminiWithNotice = (action: () => void) => {
    // With AI Mode off nothing is sent, so there is nothing to give notice about.
    if (settings.geminiNoticeAcknowledged || !settings.aiModeEnabled) {
      action();
    } else {
      setPendingGeminiAction(() => action);
    }
  };

  return (
    <AppContext.Provider
      value={{
        ready,
        storageBlocked,
        settings,
        quizAnswers,
        courses,
        assignments,
        firstMoves,
        calendarItems,
        todayStudyDay,
        timer,
        blockChangePromptOpen,
        completionReward,
        dismissCompletionReward: () => setCompletionReward(null),
        nextRewardFunFact: () =>
          setCompletionReward((prev) =>
            prev ? { ...prev, funFact: pickRandomFunFact(prev.funFact.id) } : null,
          ),
        completeAssignmentWithReward,
        dismissBlockChangePrompt: () => setBlockChangePromptOpen(false),
        updateSettings,
        recordQuizAnswer,
        undoQuizSetting,
        upsertCourse,
        upsertAssignment,
        saveCalendarBatch,
        removeAllCalendarItems,
        saveTodayPlanState,
        cacheFirstMove,
        startTimer,
        extendTimer,
        pauseResumeTimer,
        stopTimer,
        finishSession,
        reloadAll,
        requestGeminiWithNotice,
      }}
    >
      {children}

      {pendingGeminiAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gemini-notice-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="max-w-md rounded bg-surface p-6 text-text border border-border shadow-lg">
            <h2 id="gemini-notice-title" className="text-xl font-bold mb-3">
              Before using Gemini
            </h2>
            <p className="mb-4 text-sm">
              The text on this screen will be sent to Google&apos;s Gemini service. ADHD1X currently uses the free tier, where Google may use prompts to improve its products and human reviewers may read them. Please leave out personal details. Your grades and personal notes are never sent.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setPendingGeminiAction(null)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = pendingGeminiAction;
                  setPendingGeminiAction(null);
                  await updateSettings({ geminiNoticeAcknowledged: true }, false);
                  fn();
                }}
                className="min-h-[44px] min-w-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
