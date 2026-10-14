import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell, WhyOnNote } from '../../components/AppShell';
import { useApp } from '../../app/AppContext';
import {
  deleteAllData,
  exportAllData,
  getAccessCode,
  importReplaceData,
  saveAccessCode,
  validateImportFile,
} from '../../data/database';
import { ExportFile } from '../../data/schemas';
import { DISCLAIMER_TEXT_A21 } from '../onboarding/WelcomePage';

const SECTIONS = [
  ['display', 'Display'],
  ['notifications', 'Notifications'],
  ['planning', 'Planning'],
  ['timer', 'Timer'],
  ['help-tone', 'Help and tone'],
  ['answers', 'My answers'],
  ['privacy', 'Privacy'],
  ['about', 'About'],
] as const;

export const SettingsPage: React.FC = () => {
  const { section = 'display' } = useParams<{ section: string }>();
  const { settings, updateSettings, reloadAll } = useApp();
  const navigate = useNavigate();

  const [savedNotice, setSavedNotice] = useState('');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [importError, setImportError] = useState('');
  const [pendingImport, setPendingImport] = useState<{
    file: ExportFile;
    summary: { courses: number; assignments: number };
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    void getAccessCode().then(setAccessCodeInput);
  }, []);

  const saveWithConfirmation = async (patch: Partial<typeof settings>) => {
    await updateSettings(patch, true);
    setSavedNotice('Setting saved.');
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adhd1x-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result ?? ''));
        const check = validateImportFile(json);
        if (!check.ok) {
          setImportError(check.error);
          return;
        }
        setImportError('');
        setPendingImport({ file: check.parsed, summary: check.summary });
      } catch {
        setImportError('That file could not be read as JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <AppShell title="Settings">
      <div className="space-y-6">
        <nav aria-label="Settings sections" className="flex flex-wrap gap-2">
          {SECTIONS.map(([key, label]) => (
            <Link
              key={key}
              to={`/settings/${key}`}
              className={`min-h-[44px] px-3 py-2 rounded border text-sm font-medium flex items-center ${
                section === key
                  ? 'bg-accent text-on-accent border-accent'
                  : 'bg-surface text-text border-border'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {savedNotice && (
          <div role="status" className="text-sm text-muted">
            {savedNotice}
          </div>
        )}

        <div className="p-6 rounded border border-border bg-surface space-y-5">
          {section === 'display' && (
            <>
              <h2 className="text-lg font-bold">Display</h2>
              <div>
                <label htmlFor="style-select" className="block font-medium mb-1">
                  Interface style
                </label>
                <select
                  id="style-select"
                  value={settings.interfaceStyle}
                  onChange={(e) =>
                    void saveWithConfirmation({
                      interfaceStyle: e.target.value as 'space' | 'regular',
                    })
                  }
                  className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                >
                  <option value="regular">Regular</option>
                  <option value="space">Space</option>
                </select>
                <WhyOnNote settingKey="interfaceStyle" defaultValue="regular" />
              </div>

              <div>
                <label htmlFor="theme-select" className="block font-medium mb-1">
                  Theme
                </label>
                <select
                  id="theme-select"
                  value={settings.theme}
                  onChange={(e) =>
                    void saveWithConfirmation({ theme: e.target.value as 'low' | 'normal' })
                  }
                  className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                >
                  <option value="normal">Normal</option>
                  <option value="low">Low (low stimulation)</option>
                </select>
                <WhyOnNote settingKey="theme" defaultValue="normal" />
              </div>

              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dim}
                  onChange={(e) => void saveWithConfirmation({ dim: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Dim mode</span>
              </label>

              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={!settings.motion}
                  onChange={(e) => void saveWithConfirmation({ motion: !e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Turn animations and motion off</span>
              </label>

              <div>
                <label htmlFor="text-scale" className="block font-medium mb-1">
                  Text size
                </label>
                <select
                  id="text-scale"
                  value={settings.textScale}
                  onChange={(e) =>
                    void saveWithConfirmation({
                      textScale: Number(e.target.value) as 100 | 115 | 130 | 150,
                    })
                  }
                  className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                >
                  <option value={100}>100%</option>
                  <option value={115}>115%</option>
                  <option value={130}>130%</option>
                  <option value={150}>150%</option>
                </select>
              </div>

              <div>
                <label htmlFor="today-view" className="block font-medium mb-1">
                  Today view
                </label>
                <select
                  id="today-view"
                  value={settings.todayView}
                  onChange={(e) =>
                    void saveWithConfirmation({ todayView: e.target.value as 'list' | 'card' })
                  }
                  className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                >
                  <option value="list">Full list</option>
                  <option value="card">One task card</option>
                </select>
                <WhyOnNote settingKey="todayView" defaultValue="list" />
              </div>

              <div>
                <label htmlFor="timer-display" className="block font-medium mb-1">
                  Timer display
                </label>
                <select
                  id="timer-display"
                  value={settings.timerDisplay}
                  onChange={(e) =>
                    void saveWithConfirmation({
                      timerDisplay: e.target.value as 'number' | 'bar' | 'hidden',
                    })
                  }
                  className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                >
                  <option value="bar">Shrinking bar</option>
                  <option value="number">Number countdown</option>
                  <option value="hidden">Hidden</option>
                </select>
                <WhyOnNote settingKey="timerDisplay" defaultValue="bar" />
              </div>
            </>
          )}

          {section === 'notifications' && (
            <>
              <h2 className="text-lg font-bold">Notifications</h2>
              <p className="text-sm text-muted">
                ADHD1X never sends guilt, streak or &apos;come back&apos; messages. Reminders only run while the app is open.
              </p>
              <button
                type="button"
                onClick={() =>
                  void saveWithConfirmation({
                    dueReminders: false,
                    headsUp: false,
                    whereShow: 'app',
                    notificationSounds: false,
                  })
                }
                className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text font-medium"
              >
                Turn all notifications off
              </button>

              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dueReminders}
                  onChange={(e) => void saveWithConfirmation({ dueReminders: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Due-date reminders ({settings.daysAhead} days ahead)</span>
              </label>

              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.headsUp}
                  onChange={(e) => void saveWithConfirmation({ headsUp: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>5-minute heads-up before a study block ends</span>
              </label>

              <div>
                <label htmlFor="where-show" className="block font-medium mb-1">
                  Where reminders show
                </label>
                <select
                  id="where-show"
                  value={settings.whereShow}
                  onChange={async (e) => {
                    const val = e.target.value as 'app' | 'browser';
                    if (val === 'browser' && 'Notification' in window) {
                      await Notification.requestPermission();
                    }
                    await saveWithConfirmation({ whereShow: val });
                  }}
                  className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                >
                  <option value="app">In the app only</option>
                  <option value="browser">Also as browser notifications</option>
                </select>
                <p className="text-xs text-muted mt-1">
                  On iPhone (iOS 16.4+), browser notifications require tapping Share &gt; Add to Home Screen first.
                </p>
              </div>
            </>
          )}

          {section === 'planning' && (
            <>
              <h2 className="text-lg font-bold">Planning</h2>
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dayPlanHome}
                  onChange={(e) => void saveWithConfirmation({ dayPlanHome: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Make the automatic day plan my Today home view</span>
              </label>
              <WhyOnNote settingKey="dayPlanHome" defaultValue={false} />

              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.spacingEarly}
                  onChange={(e) => void saveWithConfirmation({ spacingEarly: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Schedule work 2 to 3 days before each due date</span>
              </label>

              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.majorWeighting}
                  onChange={(e) => void saveWithConfirmation({ majorWeighting: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Weight major courses higher when deadlines are close</span>
              </label>
            </>
          )}

          {section === 'timer' && (
            <>
              <h2 className="text-lg font-bold">Timer</h2>
              <div>
                <label htmlFor="starter-mins" className="block font-medium mb-1">
                  Starter timer length (minutes)
                </label>
                <input
                  id="starter-mins"
                  type="number"
                  min={1}
                  max={120}
                  value={settings.starterMinutes}
                  onChange={(e) =>
                    void saveWithConfirmation({ starterMinutes: Number(e.target.value) || 2 })
                  }
                  className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                />
              </div>
            </>
          )}

          {section === 'help-tone' && (
            <>
              <h2 className="text-lg font-bold">Help and tone</h2>
              <div>
                <label htmlFor="tone-select" className="block font-medium mb-1">
                  Wording tone
                </label>
                <select
                  id="tone-select"
                  value={settings.tone}
                  onChange={(e) =>
                    void saveWithConfirmation({ tone: e.target.value as 'warm' | 'short' })
                  }
                  className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                >
                  <option value="warm">Warm and encouraging</option>
                  <option value="short">Short and direct</option>
                </select>
              </div>
            </>
          )}

          {section === 'answers' && (
            <>
              <h2 className="text-lg font-bold">My quiz answers</h2>
              <p className="text-sm text-muted">
                Retake the 5 basic questions or reset your personalization settings.
              </p>
              <Link
                to="/welcome"
                className="inline-block min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
              >
                Review quiz questions
              </Link>
            </>
          )}

          {section === 'privacy' && (
            <>
              <h2 className="text-lg font-bold">Privacy &amp; Data Tools</h2>
              <p className="text-sm">
                Your courses, assignments, grades, and notes live on this device. Only syllabus text/files and assignment details you tap to send go to Gemini. On the free tier, Google may use prompts to improve its products and human reviewers may read them.
              </p>

              <div>
                <label htmlFor="access-code" className="block font-medium mb-1">
                  Personal Gemini access code
                </label>
                <div className="flex gap-2">
                  <input
                    id="access-code"
                    type="password"
                    autoComplete="current-password"
                    value={accessCodeInput}
                    onChange={(e) => setAccessCodeInput(e.target.value)}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await saveAccessCode(accessCodeInput);
                      setSavedNotice('Access code saved on this device.');
                    }}
                    className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
                  >
                    Save code
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void handleExport()}
                  className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
                >
                  Export my data (JSON)
                </button>
                <label className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text font-medium cursor-pointer flex items-center">
                  Import data (replace)
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportSelect}
                    className="sr-only"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-due-soon font-medium"
                >
                  Delete my data
                </button>
              </div>

              {importError && <p className="text-sm text-due-soon">{importError}</p>}

              {pendingImport && (
                <div className="p-4 rounded border-2 border-focus bg-bg space-y-3">
                  <p className="font-bold">
                    Ready to import {pendingImport.summary.assignments} assignments and{' '}
                    {pendingImport.summary.courses} courses.
                  </p>
                  <p className="text-sm">
                    This replaces all saved data on this device (your access code is kept).
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        await importReplaceData(pendingImport.file);
                        setPendingImport(null);
                        await reloadAll();
                        setSavedNotice('Data imported.');
                      }}
                      className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
                    >
                      Replace everything on this device
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingImport(null)}
                      className="min-h-[44px] px-4 py-2 rounded border border-border bg-surface"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {deleteDialogOpen && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="del-title"
                  className="p-4 rounded border-2 border-focus bg-bg space-y-3"
                >
                  <h3 id="del-title" className="font-bold">
                    Delete all data on this device?
                  </h3>
                  <p className="text-sm">
                    Would you like to export a backup copy first before deleting everything?
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleExport()}
                      className="min-h-[44px] px-4 py-2 rounded border border-border bg-surface"
                    >
                      Export first
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteAllData();
                        setDeleteDialogOpen(false);
                        await reloadAll();
                        navigate('/welcome');
                      }}
                      className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
                    >
                      Delete everything
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteDialogOpen(false)}
                      className="min-h-[44px] px-4 py-2 rounded border border-border bg-surface"
                    >
                      Keep my data
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {section === 'about' && (
            <>
              <h2 className="text-lg font-bold">About ADHD1X (Version 1.1.1)</h2>
              <p className="text-sm leading-relaxed">{DISCLAIMER_TEXT_A21}</p>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
};
