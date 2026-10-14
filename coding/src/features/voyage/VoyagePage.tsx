import React from 'react';
import { AppShell } from '../../shared/components/AppShell';
import { useApp } from '../../app/AppContext';
import { computeVoyageStatus, VOYAGE_STOPS } from './voyage';

export const VoyagePage: React.FC = () => {
  const { settings, assignments, updateSettings } = useApp();
  const isSpace = settings.interfaceStyle === 'space';
  const status = computeVoyageStatus(assignments);
  const finished = assignments.filter((a) => a.status === 'done');

  return (
    <AppShell title={isSpace ? 'Voyage' : 'Progress'}>
      <div className="space-y-6 bg-surface p-6 rounded border border-border">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted">
            Progress only moves forward. Nothing resets or decays if you take time away.
          </p>
          <button
            type="button"
            onClick={() => void updateSettings({ voyageHidden: true })}
            className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-sm"
          >
            Hide from menu
          </button>
        </div>

        {isSpace ? (
          <div className="space-y-4">
            <p className="text-lg font-bold">
              Current position: {status.currentStop} ({status.progressPoints} / {status.totalPoints} voyage points)
            </p>
            <svg
              aria-hidden="true"
              viewBox="0 0 700 100"
              className="w-full h-24 rounded bg-bg border border-border p-2"
            >
              <line x1="40" y1="50" x2="660" y2="50" stroke="currentColor" strokeDasharray="4 4" />
              {VOYAGE_STOPS.map((stop, idx) => {
                const cx = 60 + idx * 95;
                const reached = status.planetsReached.includes(stop);
                return (
                  <g key={stop}>
                    <circle
                      cx={cx}
                      cy={50}
                      r={reached ? 12 : 8}
                      fill={reached ? 'var(--color-accent)' : 'var(--color-surface)'}
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <text x={cx} y={85} textAnchor="middle" fontSize="11" fill="currentColor">
                      {stop}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="text-sm">
              Stops reached this semester:{' '}
              {status.planetsReached.length > 0 ? status.planetsReached.join(', ') : 'Launching soon'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-bold">
              Finished this semester ({finished.length})
            </h2>
            {finished.length === 0 ? (
              <p className="text-sm text-muted">No finished assignments yet.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {finished.map((a) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
};
