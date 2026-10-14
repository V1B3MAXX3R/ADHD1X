import React, { useEffect, useState } from 'react';
import { getStudyDay } from '../../shared/data/database';
import { BlockName } from '../../shared/data/schemas';
import { previousDate } from './planningLogic';

const dismissKey = (today: string) => `adhd1x_two_long_days_${today}`;

function wasDismissed(today: string): boolean {
  try {
    return sessionStorage.getItem(dismissKey(today)) === '1';
  } catch {
    return false;
  }
}

// Asks, once, before a second long day in a row (A41). Yesterday counts as long only if you accepted
// that plan with two or more blocks. Either answer is fine and nothing changes unless you tap to switch.
export const BurnoutShield: React.FC<{
  today: string;
  todayBlocks: BlockName[];
  onSwitchToOneBlock: (block: BlockName) => void;
}> = ({ today, todayBlocks, onSwitchToOneBlock }) => {
  const [yesterdayWasLong, setYesterdayWasLong] = useState(false);
  const [dismissed, setDismissed] = useState(() => wasDismissed(today));

  useEffect(() => {
    let cancelled = false;
    getStudyDay(previousDate(today))
      .then((day) => {
        if (!cancelled) setYesterdayWasLong(Boolean(day && day.accepted && day.blocks.length >= 2));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [today]);

  if (!yesterdayWasLong || todayBlocks.length < 2 || dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(dismissKey(today), '1');
    } catch {
      // Not saving the answer only means it may ask again after a reload.
    }
    setDismissed(true);
  };

  return (
    <div role="status" className="p-4 rounded border-2 border-border bg-surface space-y-2 text-sm">
      <p className="font-bold">Yesterday was a long day, and today has {todayBlocks.length} blocks.</p>
      <p className="text-muted">
        Two long days in a row can wear you out. Would you like one lighter block today, or keep {todayBlocks.length}?
        Your call.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            onSwitchToOneBlock(todayBlocks[0]);
            dismiss();
          }}
          className="min-h-[44px] px-4 py-1.5 rounded bg-accent text-on-accent font-bold"
        >
          Switch to 1 lighter block
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-[44px] px-4 py-1.5 rounded border border-border bg-bg"
        >
          Keep {todayBlocks.length} blocks
        </button>
      </div>
    </div>
  );
};
