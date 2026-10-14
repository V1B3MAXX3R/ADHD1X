import React from 'react';
import { Link } from 'react-router-dom';
import { ParallaxState } from '../types';

interface FooterProps {
  parallax: ParallaxState;
  motionPaused: boolean;
  onToggleMotion: () => void;
  cosmosLook: boolean;
  onToggleCosmosLook: () => void;
  currentStop: string;
  progressPoints: number;
  totalPoints: number;
}

export const Footer: React.FC<FooterProps> = ({
  parallax,
  motionPaused,
  onToggleMotion,
  cosmosLook,
  onToggleCosmosLook,
  currentStop,
  progressPoints,
  totalPoints,
}) => {
  const coordX = (parallax.normX * 100).toFixed(1);
  const coordY = (parallax.normY * 100).toFixed(1);

  return (
    <footer className="border-[3px] border-[#0D0D0D] bg-[#0D0D0D] text-[#E2DED9] font-mono text-xs mt-8">
      <div className="px-4 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <span aria-hidden="true" className="bg-[#E2DED9] text-[#0D0D0D] font-bold px-2 py-0.5">
              X:{coordX} / Y:{coordY}
            </span>
            <span>
              STOP: <strong>{currentStop.toUpperCase()}</strong> ({progressPoints}/{totalPoints} PTS)
            </span>
          </div>
          <p className="text-[#B5B1AC] text-[11px]">Stays on this device. No streaks. Progress only moves forward.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={motionPaused}
            onClick={onToggleMotion}
            className="min-h-[44px] px-4 py-2 border-2 border-[#E2DED9] bg-[#0D0D0D] text-[#E2DED9] font-bold uppercase tracking-wider hover:bg-[#E2DED9] hover:text-[#0D0D0D]"
          >
            Pause animations
          </button>
          <button
            type="button"
            aria-pressed={cosmosLook}
            onClick={onToggleCosmosLook}
            className="min-h-[44px] px-4 py-2 border-2 border-[#E2DED9] bg-[#0D0D0D] text-[#E2DED9] font-bold uppercase tracking-wider hover:bg-[#E2DED9] hover:text-[#0D0D0D]"
          >
            Use this look on every page
          </button>
          <Link to="/help/campus-support" className="min-h-[44px] px-3 py-2 underline flex items-center">
            Campus support
          </Link>
          <Link to="/privacy" className="min-h-[44px] px-3 py-2 underline flex items-center">
            Privacy and AI
          </Link>
        </div>
      </div>
    </footer>
  );
};
