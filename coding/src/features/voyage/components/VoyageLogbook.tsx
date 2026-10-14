import React, { useEffect, useState } from 'react';
import { useApp } from '../../../app/AppContext';
import { useClock } from '../../../shared/clock/ClockContext';
import { getLogbook, saveLogbookEntry } from '../../../shared/data/database';
import { LogbookRecord } from '../../../shared/data/schemas';
import { computeVoyageStatus, VOYAGE_STOPS } from '../voyage';

// Past voyages (A54). Saving a voyage here only writes a snapshot. It never resets or removes earned progress.
export const VoyageLogbook: React.FC<{ space: boolean }> = ({ space }) => {
  const { assignments, courses } = useApp();
  const { today } = useClock();
  const [entries, setEntries] = useState<LogbookRecord[]>([]);
  const [label, setLabel] = useState('This semester');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getLogbook().then(setEntries).catch(() => {});
  }, []);

  const status = computeVoyageStatus(assignments);
  const finishedCount = assignments.filter((a) => a.status === 'done').length;
  const endDates = courses.map((c) => c.endDate).filter((d): d is string => Boolean(d));
  const semesterOver = endDates.length > 0 && endDates.every((d) => d < today);

  const save = async () => {
    const summary = space
      ? `Reached ${status.currentStop} (${status.planetsReached.length} of ${VOYAGE_STOPS.length} stops), ${finishedCount} finished, ${status.progressPoints} voyage points.`
      : `${finishedCount} assignments finished.`;
    await saveLogbookEntry({
      semesterKey: `sem-${Date.now()}`,
      label: label.trim().slice(0, 80) || 'Semester',
      summary,
      endedAt: today,
    });
    setEntries(await getLogbook());
    setSaved(true);
  };

  return (
    <section aria-labelledby="logbook-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
      {semesterOver && space && (
        <div role="status" className="p-3 rounded border-2 border-accent bg-bg text-center text-sm">
          <p className="font-bold">Your ship is home. Ready when you are.</p>
          <p className="text-muted">Save this voyage below if you want a record of it.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="logbook-heading" className="text-lg font-bold">
            {space ? 'Captain’s logbook' : 'Past semesters'}
          </h2>
          <p className="text-sm text-muted">Progress you earn is never lost. Save a snapshot whenever you like.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={label}
            maxLength={80}
            onChange={(e) => {
              setLabel(e.target.value);
              setSaved(false);
            }}
            aria-label="Name for this entry"
            className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
          />
          <button
            type="button"
            onClick={() => void save()}
            className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
          >
            Save to logbook
          </button>
        </div>
      </div>
      {saved && (
        <p role="status" className="text-sm text-muted">
          Saved to the logbook.
        </p>
      )}
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Nothing saved yet.</p>
      ) : (
        <ul className="space-y-2">
          {[...entries]
            .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
            .map((e) => (
              <li
                key={e.semesterKey}
                className="p-3 rounded border border-border bg-bg flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div>
                  <strong>{e.label}</strong>
                  <p className="text-muted">{e.summary}</p>
                </div>
                <span className="text-xs text-muted">{e.endedAt}</span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
};
