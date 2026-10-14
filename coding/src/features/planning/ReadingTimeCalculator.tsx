import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { Assignment } from '../../shared/data/schemas';
import { calculateReadingMinutes } from './planningLogic';

// Page count to a time estimate (A89). Your pace is remembered, so the next estimate starts from it.
export const ReadingTimeCalculator: React.FC<{ assignment: Assignment }> = ({ assignment }) => {
  const { settings, updateSettings, upsertAssignment } = useApp();
  const [pages, setPages] = useState(15);
  const [pace, setPace] = useState(settings.readingMinutesPerPage);
  const minutes = calculateReadingMinutes(pages, pace);

  const apply = async () => {
    await updateSettings({ readingMinutesPerPage: Math.min(10, Math.max(1, pace)) }, true);
    await upsertAssignment({
      ...assignment,
      estimateMinutes: Math.min(2400, Math.max(5, minutes)),
      estimateSource: 'user',
    });
  };

  return (
    <div className="p-3 rounded border border-border bg-surface space-y-2 text-sm">
      <p className="font-bold">Estimate the reading time from pages</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span>Pages</span>
          <input
            type="number"
            min={1}
            max={500}
            value={pages}
            onChange={(e) => setPages(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 min-h-[44px] px-2 py-1 rounded border border-border bg-bg text-text"
          />
        </label>
        <label className="flex items-center gap-2">
          <span>Minutes per page</span>
          <input
            type="number"
            step="0.5"
            min={1}
            max={10}
            value={pace}
            onChange={(e) => setPace(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
            className="w-20 min-h-[44px] px-2 py-1 rounded border border-border bg-bg text-text"
          />
        </label>
        <span className="font-bold">about {minutes} minutes</span>
        <button
          type="button"
          onClick={() => void apply()}
          className="min-h-[44px] px-3 py-1 rounded bg-accent text-on-accent font-medium"
        >
          Use {minutes} minutes
        </button>
      </div>
    </div>
  );
};
