import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { useClock } from './ClockContext';
import { getClockNotices } from './notices';

const DISMISSED_KEY = 'adhd1x_dismissed_notices';
const SENT_KEY = 'adhd1x_sent_notices';

function readSet(key: string): Set<string> {
  try {
    return new Set<string>(JSON.parse(sessionStorage.getItem(key) ?? '[]'));
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>): void {
  try {
    sessionStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // storage blocked: notices may show again, which is harmless
  }
}

// Heads-up and due-soon notices (only if turned on in Settings, never in quiet hours).
export const ClockNotices: React.FC = () => {
  const { settings, assignments, todayStudyDay } = useApp();
  const { now, today } = useClock();
  const [dismissed, setDismissed] = useState(() => readSet(DISMISSED_KEY));

  // The blocks you picked for today, if you picked any; otherwise your usual blocks.
  const studyBlocks = todayStudyDay && todayStudyDay.date === today ? todayStudyDay.blocks : settings.usualBlocks;

  const notices = useMemo(
    () => getClockNotices(now, settings, assignments, studyBlocks).filter((n) => !dismissed.has(n.id)),
    [now, settings, assignments, studyBlocks, dismissed],
  );

  // Optional pop-up from the browser, once per notice, only if the person chose "browser" and allowed it.
  useEffect(() => {
    if (settings.whereShow !== 'browser' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const sent = readSet(SENT_KEY);
    let changed = false;
    for (const n of notices) {
      if (sent.has(n.id)) continue;
      new Notification('ADHD1X', { body: n.message, silent: !settings.notificationSounds });
      sent.add(n.id);
      changed = true;
    }
    if (changed) writeSet(SENT_KEY, sent);
  }, [notices, settings.whereShow, settings.notificationSounds]);

  if (notices.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    writeSet(DISMISSED_KEY, next);
  };

  return (
    <div role="status" aria-live="polite" aria-label="Reminders" className="m-4 mb-0 space-y-2">
      {notices.map((n) => (
        <div
          key={n.id}
          className="p-3 rounded border border-border bg-surface flex flex-wrap items-center justify-between gap-2 text-sm"
        >
          <span>{n.message}</span>
          <button
            type="button"
            onClick={() => dismiss(n.id)}
            className="min-h-[44px] px-3 underline text-text"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
};
