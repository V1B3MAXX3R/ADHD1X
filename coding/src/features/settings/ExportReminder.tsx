import React, { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { useClock } from '../../shared/clock/ClockContext';
import { exportAllData, getDB } from '../../shared/data/database';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// One-time offer to save a backup, about a week after first use (FR-20, T76). Everything lives on
// this device, so a backup file is the only copy that could survive a cleared browser.
export const ExportReminder: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const { now, today } = useClock();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (settings.exportPromptShown) {
      setShow(false);
      return;
    }
    let cancelled = false;
    getDB()
      .then((db) => db.get('meta', 'main'))
      .then((meta) => {
        if (cancelled || !meta?.createdAt) return;
        if (now.getTime() - new Date(meta.createdAt).getTime() >= SEVEN_DAYS_MS) setShow(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [settings.exportPromptShown, now]);

  if (!show) return null;

  const finish = async () => {
    setShow(false);
    await updateSettings({ exportPromptShown: true }, false);
  };

  const exportNow = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adhd1x-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await finish();
  };

  return (
    <div
      role="status"
      className="m-4 mb-0 p-3 rounded border border-accent bg-surface text-sm flex flex-wrap items-center justify-between gap-3"
    >
      <span>Your data stays on this device. Would you like to save a backup copy of your courses and tasks?</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void exportNow()}
          className="min-h-[44px] px-3 py-1 rounded bg-accent text-on-accent font-medium"
        >
          Save a backup
        </button>
        <button
          type="button"
          onClick={() => void finish()}
          className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg"
        >
          Not now
        </button>
      </div>
    </div>
  );
};
