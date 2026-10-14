import React from 'react';

export const PlanetDefs: React.FC = () => (
  <>
    <linearGradient id="jupiter-bands" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#D8A373" />
      <stop offset="25%" stopColor="#B97A4B" />
      <stop offset="50%" stopColor="#EACF9E" />
      <stop offset="75%" stopColor="#C48355" />
      <stop offset="100%" stopColor="#9A5F38" />
    </linearGradient>
    <linearGradient id="saturn-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#F4D58D" />
      <stop offset="100%" stopColor="#C59B4E" />
    </linearGradient>
    <linearGradient id="neptune-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#5FD0C4" />
      <stop offset="100%" stopColor="#26547C" />
    </linearGradient>
    <linearGradient id="mars-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#E07A5F" />
      <stop offset="100%" stopColor="#9E3B24" />
    </linearGradient>
  </>
);

export const BackgroundPlanets: React.FC = () => (
  <>
    {/* Moon, top left */}
    <g opacity="0.35" transform="translate(115, 165)">
      <circle r="28" fill="#B8BEDD" />
      <circle cx="-8" cy="-6" r="5" fill="#8A93C4" />
      <circle cx="10" cy="8" r="7" fill="#8A93C4" />
      <circle cx="-4" cy="12" r="3.5" fill="#8A93C4" />
    </g>

    {/* Mars, bottom left */}
    <g opacity="0.38" transform="translate(160, 690)">
      <circle r="42" fill="url(#mars-body)" />
      <path d="M -28 -10 Q -5 -22 25 -8" stroke="#F4A261" strokeWidth="3" fill="none" opacity="0.4" />
      <path d="M -32 12 Q 5 24 30 6" stroke="#6B2212" strokeWidth="4" fill="none" opacity="0.45" />
    </g>

    {/* Saturn, top right */}
    <g opacity="0.42" transform="translate(1250, 175) rotate(-18)">
      <ellipse rx="92" ry="22" fill="none" stroke="#EACF9E" strokeWidth="6" strokeOpacity="0.55" />
      <ellipse rx="74" ry="16" fill="none" stroke="#5FD0C4" strokeWidth="2.5" strokeOpacity="0.4" />
      <circle r="38" fill="url(#saturn-body)" />
    </g>

    {/* Jupiter, bottom right */}
    <g opacity="0.34" transform="translate(1290, 670)">
      <circle r="64" fill="url(#jupiter-bands)" />
      <ellipse cx="18" cy="16" rx="13" ry="8" fill="#B84A39" opacity="0.75" />
    </g>

    {/* Neptune, upper middle */}
    <g opacity="0.32" transform="translate(940, 105)">
      <circle r="24" fill="url(#neptune-body)" />
      <circle r="29" fill="none" stroke="#5FD0C4" strokeWidth="1.5" strokeOpacity="0.4" />
    </g>
  </>
);
