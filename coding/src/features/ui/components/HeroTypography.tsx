import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TabConfig } from '../types';

interface HeroTypographyProps {
  tab: TabConfig;
  reducedMotion: boolean;
  /** Set only when there is a task and no timer is already running. */
  onQuickStart?: () => void;
  quickStartName?: string | null;
}

export const HeroTypography: React.FC<HeroTypographyProps> = ({ tab, reducedMotion, onQuickStart, quickStartName }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
      transition={{ duration: reducedMotion ? 0 : 0.28, ease: 'easeOut' }}
      className="space-y-5"
    >
      <div className="inline-flex flex-wrap items-center gap-2 border-2 border-[#0D0D0D] bg-[#0D0D0D] text-[#E2DED9] px-3 py-1 text-xs font-mono uppercase tracking-widest">
        <span>{tab.issueNumber}</span>
        <span aria-hidden="true">•</span>
        <span>{tab.subheadline}</span>
      </div>

      <h2 className="pulp-display-title">{tab.headline}</h2>

      <p className="text-sm sm:text-base font-mono leading-relaxed text-[#0D0D0D] bg-[#E2DED9] border-l-4 border-[#0D0D0D] pl-4 py-1 max-w-xl">
        {tab.description}
      </p>

      <div
        role="region"
        aria-label="Section numbers"
        className="p-3 border-2 border-[#0D0D0D] bg-[#E2DED9] pulp-woodcut-hatch font-mono text-xs space-y-2"
      >
        <div className="font-bold uppercase tracking-wider text-[#0D0D0D] border-b border-[#0D0D0D] pb-1">
          {tab.metricsBarText}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {tab.metrics.map((m) => (
            <div key={m.label} className="bg-[#E2DED9] border border-[#0D0D0D] px-2.5 py-1.5">
              <span className="block text-[10px] uppercase text-[#5A5856]">{m.label}</span>
              <span className="font-bold text-xs text-[#0D0D0D]">{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="button" onClick={() => navigate(tab.ctaRoute)} className="pulp-ink-button px-6 py-3 text-sm">
          {tab.ctaLabel} →
        </button>
        {onQuickStart && quickStartName && (
          <button type="button" onClick={onQuickStart} className="pulp-ink-button-secondary px-4 py-3 text-xs">
            Start the timer now: &ldquo;{quickStartName}&rdquo;
          </button>
        )}
      </div>
    </motion.div>
  );
};
