import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../app/AppContext';

// The footer shown on every page in the Cosmos look.
export const CosmosFooter: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const btn =
    'min-h-[44px] px-4 py-2 border-2 border-[#E2DED9] bg-[#0D0D0D] text-[#E2DED9] font-bold uppercase tracking-wider text-xs hover:bg-[#E2DED9] hover:text-[#0D0D0D]';

  return (
    <footer className="border-t-[3px] border-[#0D0D0D] bg-[#0D0D0D] text-[#E2DED9] font-mono text-xs">
      <div className="max-w-6xl w-full mx-auto px-4 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <p className="text-[#B5B1AC] text-[11px]">ADHD1X. Stays on this device. No streaks. Progress only moves forward.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={!settings.motion}
            onClick={() => void updateSettings({ motion: !settings.motion }, true)}
            className={btn}
          >
            Pause animations
          </button>
          <button type="button" onClick={() => void updateSettings({ cosmosLook: false }, true)} className={btn}>
            Turn off the Cosmos look
          </button>
          <Link to="/cosmos" className="min-h-[44px] px-3 py-2 underline flex items-center">
            Cosmos page
          </Link>
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
