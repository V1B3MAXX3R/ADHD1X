import React, { useState } from 'react';
import { useApp } from '../../../app/AppContext';
import { Assignment } from '../../../shared/data/schemas';
import { computeCatchUpGradeMath } from '../catchUp';
import { useCatchUp } from '../useCatchUp';

const toNumber = (s: string): number | undefined => (s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Number(s));

export const GradeCalculator: React.FC<{ assignments: Assignment[] }> = ({ assignments }) => {
  const { courses, upsertAssignment } = useApp();
  const { catchUp, save } = useCatchUp();
  const [quickCurrent, setQuickCurrent] = useState(catchUp.quickCurrentPercent?.toString() ?? '');
  const [quickRemaining, setQuickRemaining] = useState(catchUp.quickRemainingWeight?.toString() ?? '');

  const math = computeCatchUpGradeMath({
    targetGrade: catchUp.targetGrade,
    assignments,
    quickCurrentPercent: toNumber(quickCurrent),
    quickRemainingWeight: toNumber(quickRemaining),
  });

  return (
    <section aria-labelledby="grade-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="grade-heading" className="text-lg font-bold">
          1. Target grade and score math
        </h2>
        <span className="text-xs px-2.5 py-1 rounded bg-bg border border-border text-muted">
          <span aria-hidden="true">🔒 </span>Done on this device. Grades never go to Gemini.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cu-course" className="block text-sm font-medium mb-1">
            Course to calculate
          </label>
          <select
            id="cu-course"
            value={catchUp.selectedCourseId}
            onChange={(e) => void save({ selectedCourseId: e.target.value })}
            className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
          >
            <option value="all">All courses combined</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cu-target" className="block text-sm font-medium mb-1">
            Target final grade (%)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="cu-target"
              type="number"
              min={0}
              max={100}
              value={catchUp.targetGrade}
              onChange={(e) => {
                const n = toNumber(e.target.value);
                if (n !== undefined) void save({ targetGrade: Math.min(100, Math.max(0, n)) });
              }}
              className="w-28 min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text font-bold"
            />
            {[70, 80, 90].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => void save({ targetGrade: preset })}
                className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-xs font-medium"
              >
                {preset}% ({preset === 90 ? 'A' : preset === 80 ? 'B' : 'C'})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 rounded border border-border bg-bg space-y-3">
        <h3 className="font-bold text-sm">
          Quick check from your Canvas gradebook (or leave blank to use the assignment scores below)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="quick-curr" className="block text-xs font-medium mb-1">
              Current overall grade in this class (%)
            </label>
            <input
              id="quick-curr"
              type="number"
              min={0}
              max={100}
              value={quickCurrent}
              onChange={(e) => {
                setQuickCurrent(e.target.value);
                void save({ quickCurrentPercent: toNumber(e.target.value) });
              }}
              className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text"
            />
          </div>
          <div>
            <label htmlFor="quick-rem" className="block text-xs font-medium mb-1">
              Part of the course not graded yet (%)
            </label>
            <input
              id="quick-rem"
              type="number"
              min={1}
              max={100}
              value={quickRemaining}
              onChange={(e) => {
                setQuickRemaining(e.target.value);
                void save({ quickRemainingWeight: toNumber(e.target.value) });
              }}
              className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text"
            />
          </div>
        </div>
      </div>

      <div role="status" className="p-4 rounded border-2 border-accent bg-bg space-y-2">
        <p className="font-bold">{math.plainSummary}</p>
        {math.currentAveragePercent !== null && (
          <p className="text-xs text-muted">
            Current average: {math.currentAveragePercent}% • Target: {catchUp.targetGrade}%
          </p>
        )}
      </div>

      {assignments.length > 0 && (
        <details className="p-3 rounded border border-border bg-bg">
          <summary className="cursor-pointer font-medium text-sm min-h-[44px] flex items-center">
            Enter or edit scores for each assignment ({assignments.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 p-2 rounded border border-border bg-surface text-sm"
              >
                <span className="font-bold">{a.name}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2">
                    <span className="text-xs text-muted">Your score</span>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={a.earnedPoints ?? ''}
                      onChange={(e) => void upsertAssignment({ ...a, earnedPoints: toNumber(e.target.value) })}
                      className="w-24 min-h-[44px] px-2 py-1 rounded border border-border bg-bg text-text"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-xs text-muted">out of</span>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={a.points ?? ''}
                      onChange={(e) => void upsertAssignment({ ...a, points: toNumber(e.target.value) })}
                      className="w-24 min-h-[44px] px-2 py-1 rounded border border-border bg-bg text-text"
                    />
                  </label>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};
