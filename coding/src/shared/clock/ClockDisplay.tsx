import React from 'react';
import { useApp } from '../../app/AppContext';
import { useClock } from './ClockContext';
import { formatClockLabel, toLocalIso } from './clockLogic';

// Not a live region: a clock that announces itself every minute would be noise for screen readers.
export const ClockDisplay: React.FC = () => {
  const { settings } = useApp();
  const { now } = useClock();
  if (!settings.showClock) return null;
  return (
    <time dateTime={toLocalIso(now)} className="text-sm text-muted hidden sm:inline">
      {formatClockLabel(now)}
    </time>
  );
};
