import React from 'react';
import { Assignment } from '../../../shared/data/schemas';
import { PLANET_DETAILS } from '../planets';
import { VOYAGE_POINTS_BY_TYPE, VOYAGE_STOPS, VoyageStatus } from '../voyage';

export const PlanetBadges: React.FC<{ status: VoyageStatus }> = ({ status }) => (
  <section aria-labelledby="badges-heading" className="space-y-3">
    <h2 id="badges-heading" className="text-lg font-bold">
      Stops on the route
    </h2>
    <ul className="grid gap-2 sm:grid-cols-2">
      {VOYAGE_STOPS.map((stop) => {
        const d = PLANET_DETAILS[stop];
        const reached = status.planetsReached.includes(stop);
        return (
          <li key={stop} className="p-3 rounded border border-border bg-bg flex gap-3 items-start">
            <span
              aria-hidden="true"
              className="mt-1 inline-block w-4 h-4 rounded-full shrink-0"
              style={{ background: d.color, opacity: reached ? 1 : 0.4 }}
            />
            <div className="text-sm">
              <p className="font-bold">
                {stop}: {reached ? 'reached' : 'not reached yet'}
              </p>
              {reached ? (
                <p className="text-muted">
                  {d.rewardTitle}. {d.desc}
                </p>
              ) : (
                <p className="text-muted">Keep finishing assignments to get here.</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  </section>
);

export const MissionLog: React.FC<{ finished: Assignment[] }> = ({ finished }) => {
  const newestFirst = [...finished].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  return (
    <section aria-labelledby="log-heading" className="space-y-3">
      <h2 id="log-heading" className="text-lg font-bold">
        Mission log ({finished.length})
      </h2>
      {finished.length === 0 ? (
        <p className="text-sm text-muted">No finished assignments yet. Your first one launches the ship.</p>
      ) : (
        <ul className="space-y-2">
          {newestFirst.map((a) => (
            <li key={a.id} className="p-3 rounded border border-border bg-bg text-sm flex flex-wrap justify-between gap-2">
              <span className="font-medium">{a.name}</span>
              <span className="text-muted">+{VOYAGE_POINTS_BY_TYPE[a.type] ?? 1} voyage points</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
