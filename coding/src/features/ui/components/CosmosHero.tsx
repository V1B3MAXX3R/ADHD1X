import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useApp } from '../../../app/AppContext';
import { computeVoyageStatus } from '../../voyage/voyage';
import { pageInfoFor } from '../pageInfo';
import { ParallaxState } from '../types';
import { VectorStage } from './VectorStage';

// The header band shown at the top of every page in the Cosmos look: a label, the page title as a big
// headline, one plain sentence, and a small illustration that moves a little with the pointer.
export const CosmosHero: React.FC<{
  title: string;
  pathname: string;
  headingRef: React.RefObject<HTMLHeadingElement>;
}> = ({ title, pathname, headingRef }) => {
  const { settings, assignments } = useApp();
  const systemReduced = useReducedMotion();
  const reducedMotion = !settings.motion || Boolean(systemReduced);
  const info = pageInfoFor(pathname);

  const [parallax, setParallax] = useState<ParallaxState>({
    normX: 0,
    normY: 0,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1280,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
    isPointerInside: false,
  });

  useEffect(() => {
    const onResize = () =>
      setParallax((p) => ({ ...p, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (reducedMotion) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setParallax((p) => ({
        ...p,
        normX: Math.max(-0.5, Math.min(0.5, (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5)),
        normY: Math.max(-0.5, Math.min(0.5, (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5)),
        isPointerInside: true,
      }));
    },
    [reducedMotion],
  );

  const status = useMemo(() => computeVoyageStatus(assignments), [assignments]);
  const ratio = status.totalPoints > 0 ? Math.min(1, status.progressPoints / status.totalPoints) : 0;

  return (
    <section
      aria-label="Page header"
      onPointerMove={onMove}
      onPointerLeave={() => setParallax((p) => ({ ...p, normX: 0, normY: 0, isPointerInside: false }))}
      className="border-b-[3px] border-[#0D0D0D] pulp-halftone-surface"
    >
      <div className="max-w-6xl w-full mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-7 space-y-4 z-10">
          <div className="inline-flex flex-wrap items-center gap-2 border-2 border-[#0D0D0D] bg-[#0D0D0D] text-[#E2DED9] px-3 py-1 text-xs font-mono uppercase tracking-widest">
            <span>{info.section}</span>
            <span aria-hidden="true">•</span>
            <span>SHIP AT: {status.currentStop.toUpperCase()}</span>
          </div>
          <h1 ref={headingRef} tabIndex={-1} className="pulp-display-title outline-none">
            {title}
          </h1>
          <p className="text-sm sm:text-base font-mono leading-relaxed text-[#0D0D0D] bg-[#E2DED9] border-l-4 border-[#0D0D0D] pl-4 py-1 max-w-xl">
            {info.tagline}
          </p>
        </div>
        <div className="hidden md:block md:col-span-5">
          <VectorStage
            compact
            activeTab={info.tab}
            parallax={parallax}
            reducedMotion={reducedMotion}
            currentVoyageStop={status.currentStop}
            voyageProgressRatio={ratio}
          />
        </div>
      </div>
    </section>
  );
};
