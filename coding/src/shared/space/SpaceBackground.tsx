import React from 'react';
import { useApp } from '../../app/AppContext';
import { BackgroundPlanets, PlanetDefs } from './BackgroundPlanets';
import { NebulaDefs, Starfield } from './Starfield';

// Decorative only. Shown in Space style, and never in the Low (low stimulation) theme (A35, A57).
export const SpaceBackground: React.FC = () => {
  const { settings } = useApp();
  if (settings.interfaceStyle !== 'space' || settings.theme === 'low') return null;

  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="w-full h-full opacity-90">
        <defs>
          <NebulaDefs />
          <PlanetDefs />
        </defs>
        <Starfield />
        <BackgroundPlanets />
      </svg>
    </div>
  );
};
