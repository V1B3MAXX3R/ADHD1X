import React from 'react';
import { PLANET_DETAILS } from '../planets';
import { VOYAGE_STOPS, VoyageStatus } from '../voyage';

const FIRST_STOP_X = 90;
const STOP_GAP = 105;
const LAST_STOP_X = FIRST_STOP_X + STOP_GAP * (VOYAGE_STOPS.length - 1);
const LINE_Y = 110;

// Decorative picture (aria-hidden). The same information is in the text list in MissionLog.
export const SolarSystemMap: React.FC<{ status: VoyageStatus }> = ({ status }) => {
  const ratio = status.totalPoints > 0 ? Math.min(1, status.progressPoints / status.totalPoints) : 0;
  const shipX = 40 + ratio * (LAST_STOP_X - 40);

  return (
    <div className="overflow-x-auto">
      <svg
        aria-hidden="true"
        viewBox="0 0 800 210"
        className="w-full min-w-[620px] h-52 rounded-lg bg-bg border border-border text-muted"
      >
        <defs>
          <linearGradient id="flight-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5FD0C4" />
            <stop offset="100%" stopColor="#FFD66B" />
          </linearGradient>
        </defs>

        <g fill="#EEF0FA" opacity="0.4">
          {[[50, 30], [190, 25], [330, 40], [490, 22], [640, 35], [750, 28], [140, 180], [420, 185], [690, 175]].map(
            ([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />
            ),
          )}
        </g>

        <g transform={`translate(30, ${LINE_Y})`}>
          <circle r="10" fill="#3B82F6" />
          <text y="28" textAnchor="middle" fontSize="10" fill="currentColor">
            Earth
          </text>
        </g>

        <line x1="40" y1={LINE_Y} x2={LAST_STOP_X} y2={LINE_Y} stroke="#8A93C4" strokeWidth="2" strokeDasharray="6 6" opacity="0.45" />
        <line x1="40" y1={LINE_Y} x2={shipX} y2={LINE_Y} stroke="url(#flight-line)" strokeWidth="3" />

        {VOYAGE_STOPS.map((stop, idx) => {
          const cx = FIRST_STOP_X + idx * STOP_GAP;
          const d = PLANET_DETAILS[stop];
          const reached = status.planetsReached.includes(stop);
          return (
            <g key={stop} transform={`translate(${cx}, ${LINE_Y})`} opacity={reached ? 1 : 0.45}>
              {d.ring && (
                <ellipse rx={d.size * 1.7} ry={d.size * 0.4} fill="none" stroke={d.color} strokeWidth="2" opacity="0.7" />
              )}
              <circle r={d.size} fill={d.color} />
              {reached && <circle r={d.size + 5} fill="none" stroke="var(--color-accent)" strokeWidth="2" />}
              <text y={d.size + 24} textAnchor="middle" fontSize="11" fill="currentColor">
                {stop}
              </text>
            </g>
          );
        })}

        {/* Spacecraft */}
        <g transform={`translate(${shipX}, ${LINE_Y}) rotate(90)`}>
          <path d="M 0 14 Q 4 22 0 28 Q -4 22 0 14 Z" fill="#FFB454" />
          <polygon points="0,-12 7,8 0,12 -7,8" fill="#EEF0FA" stroke="#8A93C4" strokeWidth="1" />
          <circle cy="-2" r="2.5" fill="#5FD0C4" />
        </g>
      </svg>
    </div>
  );
};
