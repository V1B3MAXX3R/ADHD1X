import React from 'react';
import { PaletteCard } from './personalizer/PaletteCard';
import { VibeCard } from './personalizer/VibeCard';

// Shown in Settings, Display. Both helpers only suggest; you tap Apply.
export const WebsitePersonalizerPanel: React.FC = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-bold">Personalize how it looks</h2>
    <VibeCard />
    <PaletteCard />
  </div>
);
