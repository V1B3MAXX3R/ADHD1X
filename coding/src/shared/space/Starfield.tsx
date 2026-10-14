import React from 'react';

// x, y, radius. Fixed dots: nothing moves or flashes (WCAG 2.2.2, 2.3.1).
const STARS: ReadonlyArray<readonly [number, number, number]> = [
  [90, 80, 1.5], [210, 150, 1], [340, 60, 2], [520, 130, 1.2], [690, 75, 1.6],
  [880, 110, 1], [1040, 55, 2], [1290, 95, 1.4], [1380, 210, 1.8], [140, 340, 1.3],
  [310, 420, 1], [620, 290, 1.5], [970, 320, 1.2], [1180, 390, 2], [80, 640, 1.6],
  [260, 780, 1.2], [480, 710, 1.8], [770, 820, 1], [1090, 740, 1.5], [1340, 680, 1.7],
];

export const NebulaDefs: React.FC = () => (
  <>
    <radialGradient id="nebula-teal" cx="20%" cy="25%" r="45%">
      <stop offset="0%" stopColor="#5FD0C4" stopOpacity="0.14" />
      <stop offset="100%" stopColor="#0F1430" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="nebula-purple" cx="82%" cy="70%" r="50%">
      <stop offset="0%" stopColor="#8A93C4" stopOpacity="0.18" />
      <stop offset="100%" stopColor="#0F1430" stopOpacity="0" />
    </radialGradient>
  </>
);

export const Starfield: React.FC = () => (
  <>
    <rect width="1440" height="900" fill="url(#nebula-teal)" />
    <rect width="1440" height="900" fill="url(#nebula-purple)" />
    <g fill="#EEF0FA" opacity="0.55">
      {STARS.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
      ))}
    </g>
    <g fill="none" stroke="#8A93C4" strokeOpacity="0.12" strokeDasharray="6 8">
      <ellipse cx="720" cy="980" rx="520" ry="320" />
      <ellipse cx="720" cy="980" rx="760" ry="480" />
      <ellipse cx="720" cy="980" rx="1020" ry="660" />
    </g>
  </>
);
