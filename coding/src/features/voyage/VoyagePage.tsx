import React, { useState } from 'react';
import { AppShell } from '../../shared/components/AppShell';
import { useApp } from '../../app/AppContext';
import { computeVoyageStatus } from './voyage';
import { pickRandomFunFact } from './funFacts';
import { SolarSystemMap } from './components/SolarSystemMap';
import { FunFactCard } from './components/FunFactCard';
import { MissionLog, PlanetBadges } from './components/MissionLog';
import { VoyageLogbook } from './components/VoyageLogbook';

export const VoyagePage: React.FC = () => {
  const { settings, assignments, updateSettings } = useApp();
  const isSpace = settings.interfaceStyle === 'space';
  const status = computeVoyageStatus(assignments);
  const finished = assignments.filter((a) => a.status === 'done');
  const [fact, setFact] = useState(() => pickRandomFunFact());
  const percent = status.totalPoints > 0 ? Math.round((status.progressPoints / status.totalPoints) * 100) : 0;

  return (
    <AppShell title={isSpace ? 'Voyage' : 'Progress'}>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3 bg-surface p-4 rounded border border-border">
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
          <>
            <section aria-labelledby="sector-heading" className="p-6 rounded-lg border-2 border-accent bg-surface space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-accent font-bold">Current stop</p>
                  <h2 id="sector-heading" className="text-2xl font-bold">
                    {status.currentStop}
                  </h2>
                </div>
                <p className="text-right">
                  <span className="block text-xs text-muted">Voyage points</span>
                  <span className="text-xl font-bold text-accent">
                    {status.progressPoints} / {status.totalPoints} ({percent}%)
                  </span>
                </p>
              </div>
              <SolarSystemMap status={status} />
            </section>

            <PlanetBadges status={status} />
            <MissionLog finished={finished} />
            <VoyageLogbook space />

            <section aria-labelledby="facts-heading" className="space-y-3">
              <h2 id="facts-heading" className="text-lg font-bold">
                Fun fact
              </h2>
              <FunFactCard fact={fact} onAnother={() => setFact((prev) => pickRandomFunFact(prev.id))} />
            </section>
          </>
        ) : (
          <div className="space-y-3 bg-surface p-6 rounded border border-border">
            <h2 className="text-lg font-bold">Finished this semester ({finished.length})</h2>
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
        {!isSpace && <VoyageLogbook space={false} />}
      </div>
    </AppShell>
  );
};
