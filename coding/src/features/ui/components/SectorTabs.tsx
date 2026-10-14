import React from 'react';
import { motion } from 'framer-motion';
import { TabConfig, TabId } from '../types';

interface SectorTabsProps {
  tabs: TabConfig[];
  activeTab: TabId;
  onSelectTab: (id: TabId) => void;
  reducedMotion: boolean;
  hyperdriveOn: boolean;
  aiModeOn: boolean;
  onToggleAiMode: () => void;
}

// The three Cosmos sections as tabs, plus two status readouts and the AI Mode switch.
// The app's own menu stays where it always is (A73, A100), so there are no page links here.
export const SectorTabs: React.FC<SectorTabsProps> = ({
  tabs,
  activeTab,
  onSelectTab,
  reducedMotion,
  hyperdriveOn,
  aiModeOn,
  onToggleAiMode,
}) => {
  const moveTo = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    onSelectTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <header className="border-[3px] border-[#0D0D0D] bg-[#E2DED9]">
      <div className="bg-[#0D0D0D] text-[#E2DED9] px-4 py-1 text-xs flex flex-wrap items-center justify-between gap-2 font-mono">
        <span className="font-bold tracking-widest">PULP COSMOS</span>
        <div className="flex items-center gap-3">
          <span>
            PROPULSION: <strong className="underline">{hyperdriveOn ? 'HYPERDRIVE ON' : 'STANDARD ORBIT'}</strong>
          </span>
          <span aria-hidden="true">•</span>
          <span>
            GEMINI: <strong>{aiModeOn ? 'ON' : 'OFF (built-in only)'}</strong>
          </span>
        </div>
      </div>

      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Cosmos sections" className="flex flex-wrap gap-2">
          {tabs.map((tab, idx) => {
            const isSelected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    moveTo(idx + 1);
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    moveTo(idx - 1);
                  }
                }}
                className={`relative min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider border-2 border-[#0D0D0D] ${
                  isSelected ? 'bg-[#0D0D0D] text-[#E2DED9]' : 'bg-[#E2DED9] text-[#0D0D0D] hover:bg-[#d3cfc9]'
                }`}
              >
                <span className="text-[10px] font-mono mr-1.5">0{idx + 1}.</span>
                {tab.label}
                {isSelected && (
                  <motion.span
                    layoutId="pulp-tab-underbar"
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-2 h-1.5 bg-[#0D0D0D]"
                    transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 28 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-pressed={aiModeOn}
          onClick={onToggleAiMode}
          className="pulp-ink-button-secondary px-3 py-1.5 text-xs"
        >
          AI Mode: {aiModeOn ? 'On' : 'Off'}
        </button>
      </div>
    </header>
  );
};
