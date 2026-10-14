import React, { useState } from 'react';

const STORAGE_KEY = 'adhd1x_parking_lot';
const MAX_THOUGHTS = 50;
const MAX_LENGTH = 200;

function load(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_THOUGHTS) : [];
  } catch {
    return [];
  }
}

function save(list: string[]): void {
  try {
    if (list.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage can be blocked. The list still works until the page is closed.
  }
}

// Lives in the timer bar. A random thought gets parked in one line so you can stay on the task and
// look at it after the timer. Stays on this device and is cleared with "Delete all my data".
export const ParkingLot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [thought, setThought] = useState('');
  const [parked, setParked] = useState<string[]>(load);

  const update = (next: string[]) => {
    setParked(next);
    save(next);
  };

  const park = (e: React.FormEvent) => {
    e.preventDefault();
    const text = thought.trim().slice(0, MAX_LENGTH);
    if (!text) return;
    update([text, ...parked].slice(0, MAX_THOUGHTS));
    setThought('');
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
      >
        Park a thought{parked.length > 0 ? ` (${parked.length})` : ''}
      </button>
      {open && (
        <div
          role="group"
          aria-label="Parking lot for thoughts"
          className="absolute bottom-full right-0 mb-2 w-80 max-w-[90vw] p-3 rounded border border-border bg-surface shadow-lg space-y-2 text-sm"
        >
          <form onSubmit={park} className="space-y-2">
            <label htmlFor="parking-lot-input" className="block font-medium">
              Write it down, then get back to work
            </label>
            <div className="flex gap-2">
              <input
                id="parking-lot-input"
                type="text"
                maxLength={MAX_LENGTH}
                value={thought}
                onChange={(e) => setThought(e.target.value)}
                className="flex-1 min-h-[44px] px-2 py-1 rounded border border-border bg-bg text-text"
              />
              <button type="submit" className="min-h-[44px] px-3 py-1 rounded bg-accent text-on-accent font-bold">
                Park it
              </button>
            </div>
          </form>
          {parked.length > 0 && (
            <>
              <ul className="list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                {parked.map((item, i) => (
                  <li key={`${i}-${item}`}>
                    {item}{' '}
                    <button
                      type="button"
                      aria-label={`Remove: ${item}`}
                      onClick={() => update(parked.filter((_, j) => j !== i))}
                      className="underline text-muted"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => update([])} className="underline text-muted">
                Clear all
              </button>
            </>
          )}
          <p className="text-xs text-muted">Stays on this device. Never sent anywhere.</p>
        </div>
      )}
    </div>
  );
};
