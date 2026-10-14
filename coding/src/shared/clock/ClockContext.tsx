import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { formatLocalDate, formatLocalTime, minutesOfDay, msUntilNextMinute } from './clockLogic';

export interface ClockValue {
  now: Date;
  today: string;
  time: string;
  minutes: number;
}

const ClockContext = createContext<ClockValue | null>(null);

// The app's real-world clock (device time). Updates on the minute, and right away when the tab
// comes back into view, because browsers pause timers in background tabs and sleeping computers.
export const ClockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, msUntilNextMinute(new Date()));
    };
    schedule();

    const refresh = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const value = useMemo<ClockValue>(
    () => ({ now, today: formatLocalDate(now), time: formatLocalTime(now), minutes: minutesOfDay(now) }),
    [now],
  );

  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
};

export function useClock(): ClockValue {
  const ctx = useContext(ClockContext);
  if (!ctx) throw new Error('useClock must be used inside ClockProvider');
  return ctx;
}
