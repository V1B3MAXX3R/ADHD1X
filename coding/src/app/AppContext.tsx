import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Assignment,
  Course,
  FirstMoveRecord,
  QuizAnswerRecord,
  Settings,
  SettingsSchema,
  StudyDay,
} from '../data/schemas';
import {
  getAssignments,
  getCourses,
  getFirstMoves,
  getQuizAnswers,
  getSettings,
  getStudyDay,
  saveAssignment,
  saveCourse,
  saveFirstMove,
  saveQuizAnswer,
  saveSettings,
  saveStudyDay,
} from '../data/database';
import { applyQuizAnswersToSettings } from '../logic/quizRules';

interface TimerState {
  running: boolean;
  paused: boolean;
  assignmentId: string | null;
  secondsRemaining: number;
  totalSeconds: number;
  startedInBlock: string | null;
}

interface AppContextValue {
  ready: boolean;
  storageBlocked: boolean;
  settings: Settings;
  quizAnswers: QuizAnswerRecord[];
  courses: Course[];
  assignments: Assignment[];
  firstMoves: FirstMoveRecord[];
  todayStudyDay: StudyDay | null;
  timer: TimerState;
  blockChangePromptOpen: boolean;
  dismissBlockChangePrompt: () => void;
  updateSettings: (patch: Partial<Settings>, isManual?: boolean) => Promise<void>;
  recordQuizAnswer: (questionId: number, answer: 'yes' | 'no' | 'skipped') => Promise<void>;
  undoQuizSetting: (settingKey: keyof Settings, defaultValue: unknown) => Promise<void>;
  upsertCourse: (c: Course) => Promise<void>;
  upsertAssignment: (a: Assignment) => Promise<void>;
  saveTodayPlanState: (day: StudyDay) => Promise<void>;
  cacheFirstMove: (fm: FirstMoveRecord) => Promise<void>;
  startTimer: (assignmentId: string, minutes: number, currentBlock: string | null) => void;
  pauseResumeTimer: () => void;
  stopTimer: () => void;
  reloadAll: () => Promise<void>;
  requestGeminiWithNotice: (action: () => void) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getCurrentBlockName(settings: Settings): string | null {
  const d = new Date();
  const mins = d.getHours() * 60 + d.getMinutes();
  for (const [name, win] of Object.entries(settings.blockWindows)) {
    const [sh, sm] = win.start.split(':').map(Number);
    const [eh, em] = win.end.split(':').map(Number);
    if (mins >= sh * 60 + sm && mins < eh * 60 + em) return name;
  }
  return null;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => SettingsSchema.parse({}));
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswerRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [firstMoves, setFirstMoves] = useState<FirstMoveRecord[]>([]);
  const [todayStudyDay, setTodayStudyDay] = useState<StudyDay | null>(null);
  const [pendingGeminiAction, setPendingGeminiAction] = useState<(() => void) | null>(null);
  const [blockChangePromptOpen, setBlockChangePromptOpen] = useState(false);

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
    };
  });

  const reloadAll = async () => {
    try {
      const [s, q, c, a, fm, sd] = await Promise.all([
        getSettings(),
        getQuizAnswers(),
        getCourses(),
        getAssignments(),
        getFirstMoves(),
        getStudyDay(getTodayDateString()),
      ]);
      setSettings(s);
      setQuizAnswers(q);
      setCourses(c);
      setAssignments(a);
      setFirstMoves(fm);
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
    root.style.fontSize = `${settings.textScale}%`;
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

  const saveTodayPlanState = async (day: StudyDay) => {
    setTodayStudyDay(day);
    if (!storageBlocked) await saveStudyDay(day);
  };

  const cacheFirstMove = async (fm: FirstMoveRecord) => {
    setFirstMoves((prev) => [...prev.filter((x) => x.id !== fm.id), fm]);
    if (!storageBlocked) await saveFirstMove(fm);
  };

  const startTimer = (assignmentId: string, minutes: number, currentBlock: string | null) => {
    setTimer({
      running: true,
      paused: false,
      assignmentId,
      secondsRemaining: minutes * 60,
      totalSeconds: minutes * 60,
      startedInBlock: currentBlock,
    });
  };

  const pauseResumeTimer = () => {
    setTimer((prev) => ({ ...prev, paused: !prev.paused }));
  };

  const stopTimer = () => {
    setTimer((prev) => ({ ...prev, running: false, paused: false }));
    setBlockChangePromptOpen(false);
  };

  const requestGeminiWithNotice = (action: () => void) => {
    if (settings.geminiNoticeAcknowledged) {
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
        todayStudyDay,
        timer,
        blockChangePromptOpen,
        dismissBlockChangePrompt: () => setBlockChangePromptOpen(false),
        updateSettings,
        recordQuizAnswer,
        undoQuizSetting,
        upsertCourse,
        upsertAssignment,
        saveTodayPlanState,
        cacheFirstMove,
        startTimer,
        pauseResumeTimer,
        stopTimer,
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
