import React, { useState } from 'react';
import { motion, useSpring } from 'framer-motion';
import { ParallaxState, TabId } from '../types';
import { StarMask } from './StarMask';

interface VectorStageProps {
  activeTab: TabId;
  parallax: ParallaxState;
  reducedMotion: boolean;
  currentVoyageStop: string;
  voyageProgressRatio: number;
  /** Smaller picture for page headers */
  compact?: boolean;
}

const SPRING_SETTINGS = { stiffness: 110, damping: 22, mass: 0.7 };

const STAGE_DESCRIPTIONS: Record<TabId, string> = {
  'planetary-bodies': 'a ringed gas giant with a cratered moon and a storm-banded planet',
  'deep-space': 'a spiral galaxy with comets crossing in front of it',
  'exploration-scifi': 'a vintage astronaut, a space station, a telescope and a flying saucer with a tractor beam',
};

// The picture for each section. Two layers move slightly with the pointer (parallax); with motion off
// or reduced, everything stays still.
export const VectorStage: React.FC<VectorStageProps> = ({
  activeTab,
  parallax,
  reducedMotion,
  currentVoyageStop,
  voyageProgressRatio,
  compact,
}) => {
  const [ufoHovered, setUfoHovered] = useState(false);

  const fgX = useSpring(0, SPRING_SETTINGS);
  const fgY = useSpring(0, SPRING_SETTINGS);
  const mgX = useSpring(0, SPRING_SETTINGS);
  const mgY = useSpring(0, SPRING_SETTINGS);

  React.useEffect(() => {
    const mult = reducedMotion ? 0 : 1;
    fgX.set(parallax.normX * parallax.viewportWidth * 0.04 * mult);
    fgY.set(parallax.normY * parallax.viewportHeight * 0.04 * mult);
    mgX.set(parallax.normX * parallax.viewportWidth * 0.02 * mult);
    mgY.set(parallax.normY * parallax.viewportHeight * 0.02 * mult);
  }, [parallax, reducedMotion, fgX, fgY, mgX, mgY]);

  const axialSpinTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 60, ease: 'linear' as const, repeat: Infinity };

  const floatSwayAnimation = reducedMotion
    ? { y: 0, x: 0, rotate: 0 }
    : { y: [-10, 10, -10], x: [-4, 4, -4], rotate: [-3, 3, -3] };

  const floatSwayTransition = { duration: 6, ease: 'easeInOut' as const, repeat: Infinity };

  return (
    <div
      className={`relative w-full ${compact ? 'min-h-[200px] max-h-[260px]' : 'min-h-[320px] sm:min-h-[420px]'} flex items-center justify-center overflow-hidden`}
      role="img"
      aria-label={`Illustration: ${STAGE_DESCRIPTIONS[activeTab]}. Your ship is at ${currentVoyageStop}.`}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <StarMask activeTab={activeTab} parallax={parallax} reducedMotion={reducedMotion} />
      </div>

      {/* SECTION 1: ringed gas giant, cratered moon, storm-banded planet */}
      {activeTab === 'planetary-bodies' && (
        <>
          <motion.div
            style={{ x: mgX, y: mgY }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <svg viewBox="0 0 800 520" className="w-full h-full max-h-[520px]">
              <motion.g
                style={{ originX: '185px', originY: '145px' }}
                animate={reducedMotion ? { rotate: 0 } : { rotate: [0, 360] }}
                transition={axialSpinTransition}
              >
                <circle cx="185" cy="145" r="48" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="3" />
                <circle cx="168" cy="130" r="11" fill="#817E7B" stroke="#0D0D0D" strokeWidth="2" />
                <circle cx="204" cy="158" r="14" fill="#6A6966" stroke="#0D0D0D" strokeWidth="2" />
                <circle cx="176" cy="168" r="7" fill="#817E7B" stroke="#0D0D0D" strokeWidth="1.5" />
                <path d="M 145 165 Q 185 195 225 160" fill="none" stroke="#0D0D0D" strokeWidth="2" strokeDasharray="3 3" />
              </motion.g>

              <motion.g
                style={{ originX: '635px', originY: '365px' }}
                animate={reducedMotion ? { rotate: 0 } : { rotate: [360, 0] }}
                transition={axialSpinTransition}
              >
                <circle cx="635" cy="365" r="64" fill="#817E7B" stroke="#0D0D0D" strokeWidth="3.5" />
                <path d="M 575 345 Q 635 332 695 345" fill="none" stroke="#E2DED9" strokeWidth="5" />
                <path d="M 572 365 Q 635 352 698 365" fill="none" stroke="#0D0D0D" strokeWidth="4" />
                <path d="M 578 386 Q 635 375 692 386" fill="none" stroke="#E2DED9" strokeWidth="3.5" />
                <ellipse cx="652" cy="374" rx="14" ry="8" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="2.5" />
              </motion.g>
            </svg>
          </motion.div>

          <motion.div
            style={{ x: fgX, y: fgY }}
            className="relative z-10 pointer-events-none flex items-center justify-center w-full h-full"
          >
            <svg viewBox="0 0 800 520" className="w-full h-full max-h-[520px]">
              <motion.g animate={floatSwayAnimation} transition={floatSwayTransition}>
                <circle cx="400" cy="255" r="96" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="4" />
                <path d="M 312 218 C 365 204, 435 204, 488 218" stroke="#0D0D0D" strokeWidth="6" fill="none" />
                <path d="M 304 242 C 365 228, 435 228, 496 242" stroke="#6A6966" strokeWidth="9" fill="none" />
                <path d="M 306 268 C 365 256, 435 256, 494 268" stroke="#0D0D0D" strokeWidth="5" fill="none" />
                <path d="M 318 294 C 365 282, 435 282, 482 294" stroke="#817E7B" strokeWidth="7" fill="none" />

                <g transform="rotate(-19 400 255)">
                  <ellipse cx="400" cy="255" rx="198" ry="42" fill="none" stroke="#E2DED9" strokeWidth="12" />
                  <ellipse cx="400" cy="255" rx="198" ry="42" fill="none" stroke="#0D0D0D" strokeWidth="3.5" />
                  <ellipse
                    cx="400"
                    cy="255"
                    rx="166"
                    ry="32"
                    fill="none"
                    stroke="#817E7B"
                    strokeWidth="5"
                    strokeDasharray="10 6"
                  />
                </g>

                {/* Your ship, placed along the route by real progress */}
                <g transform={`translate(${275 + Math.round(voyageProgressRatio * 240)}, 135)`}>
                  <rect x="-62" y="-32" width="124" height="20" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="1.8" />
                  <text x="0" y="-19" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#0D0D0D">
                    SHIP AT: {currentVoyageStop.toUpperCase()}
                  </text>
                  <polygon
                    points="-12,0 14,0 22,5 14,10 -12,10 -6,5"
                    fill="#E2DED9"
                    stroke="#0D0D0D"
                    strokeWidth="2"
                  />
                </g>
              </motion.g>
            </svg>
          </motion.div>
        </>
      )}

      {/* SECTION 2: spiral galaxy and comets */}
      {activeTab === 'deep-space' && (
        <>
          <motion.div
            style={{ x: mgX, y: mgY }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <svg viewBox="0 0 800 520" className="w-full h-full max-h-[520px]">
              <motion.g
                style={{ originX: '400px', originY: '260px' }}
                animate={reducedMotion ? { rotate: 0 } : { rotate: [0, 360] }}
                transition={axialSpinTransition}
              >
                <circle cx="400" cy="260" r="26" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="4" />
                <path
                  d="M 400 260 C 445 210, 530 220, 560 285 C 590 355, 510 430, 410 420 C 295 410, 220 310, 255 195"
                  fill="none"
                  stroke="#E2DED9"
                  strokeWidth="6"
                  strokeDasharray="14 8"
                />
                <path
                  d="M 400 260 C 355 310, 270 300, 240 235 C 210 165, 290 90, 390 100 C 505 110, 580 210, 545 325"
                  fill="none"
                  stroke="#817E7B"
                  strokeWidth="5"
                  strokeDasharray="10 6"
                />
                <ellipse
                  cx="400"
                  cy="260"
                  rx="175"
                  ry="82"
                  fill="none"
                  stroke="#E2DED9"
                  strokeWidth="2.5"
                  strokeDasharray="4 8"
                  transform="rotate(-28 400 260)"
                />
              </motion.g>

              {!reducedMotion && (
                <motion.circle
                  cx="400"
                  cy="260"
                  r="150"
                  fill="none"
                  stroke="#E2DED9"
                  strokeWidth="2"
                  strokeDasharray="6 10"
                  animate={{ scale: [1.25, 0.35], opacity: [0, 0.85, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </svg>
          </motion.div>

          <motion.div
            style={{ x: fgX, y: fgY }}
            className="relative z-10 pointer-events-none flex items-center justify-center w-full h-full"
          >
            <svg viewBox="0 0 800 520" className="w-full h-full max-h-[520px]">
              <motion.g
                animate={reducedMotion ? { x: 0, y: 0 } : { x: [-220, 320], y: [-110, 160], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: 'linear' }}
              >
                <line x1="140" y1="80" x2="265" y2="142" stroke="#E2DED9" strokeWidth="4" />
                <line x1="115" y1="68" x2="245" y2="132" stroke="#817E7B" strokeWidth="2" strokeDasharray="6 4" />
                <circle cx="268" cy="144" r="9" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="2.5" />
              </motion.g>

              <motion.g
                animate={reducedMotion ? { x: 0, y: 0 } : { x: [-180, 290], y: [-90, 145], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 6.4, delay: 2.3, repeat: Infinity, ease: 'linear' }}
              >
                <line x1="420" y1="260" x2="535" y2="318" stroke="#E2DED9" strokeWidth="3.5" />
                <circle cx="538" cy="320" r="7" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="2" />
              </motion.g>
            </svg>
          </motion.div>
        </>
      )}

      {/* SECTION 3: astronaut, space station, telescope, flying saucer */}
      {activeTab === 'exploration-scifi' && (
        <>
          <motion.div
            style={{ x: mgX, y: mgY }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <svg viewBox="0 0 800 520" className="w-full h-full max-h-[520px]">
              <motion.g
                style={{ originX: '205px', originY: '155px' }}
                animate={reducedMotion ? { rotate: 0 } : { rotate: [0, 360] }}
                transition={axialSpinTransition}
              >
                <circle cx="205" cy="155" r="52" fill="none" stroke="#E2DED9" strokeWidth="8" />
                <circle cx="205" cy="155" r="52" fill="none" stroke="#0D0D0D" strokeWidth="2" />
                <line x1="153" y1="155" x2="257" y2="155" stroke="#E2DED9" strokeWidth="4" />
                <line x1="205" y1="103" x2="205" y2="207" stroke="#E2DED9" strokeWidth="4" />
                <circle cx="205" cy="155" r="14" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="2.5" />
              </motion.g>

              <g transform="translate(595, 365)">
                <line x1="0" y1="30" x2="-35" y2="95" stroke="#E2DED9" strokeWidth="4" />
                <line x1="0" y1="30" x2="35" y2="95" stroke="#E2DED9" strokeWidth="4" />
                <line x1="0" y1="30" x2="0" y2="98" stroke="#817E7B" strokeWidth="3.5" />
                <g transform="rotate(-32 0 25)">
                  <rect x="-48" y="12" width="96" height="22" rx="3" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="3" />
                  <rect x="-58" y="15" width="14" height="16" fill="#817E7B" stroke="#0D0D0D" strokeWidth="2" />
                </g>
              </g>
            </svg>
          </motion.div>

          <motion.div style={{ x: fgX, y: fgY }} className="relative z-10 flex items-center justify-center w-full h-full">
            <svg viewBox="0 0 800 520" className="w-full h-full max-h-[520px]">
              <motion.g animate={floatSwayAnimation} transition={floatSwayTransition}>
                <g transform="translate(290, 265)">
                  <rect x="-28" y="-22" width="56" height="64" rx="6" fill="#817E7B" stroke="#0D0D0D" strokeWidth="3" />
                  <circle cx="0" cy="-42" r="28" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="3.5" />
                  <ellipse cx="4" cy="-42" rx="16" ry="12" fill="#0D0D0D" stroke="#6A6966" strokeWidth="2" />
                  <line x1="0" y1="-70" x2="0" y2="-86" stroke="#E2DED9" strokeWidth="3" />
                  <circle cx="0" cy="-88" r="4" fill="#E2DED9" />
                  <rect x="-22" y="-14" width="44" height="56" rx="8" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="3" />
                  <line x1="-16" y1="2" x2="16" y2="2" stroke="#0D0D0D" strokeWidth="2" />
                  <line x1="-16" y1="16" x2="16" y2="16" stroke="#0D0D0D" strokeWidth="2" />
                  <path d="M -22 20 Q -75 55 -125 25" fill="none" stroke="#E2DED9" strokeWidth="3" strokeDasharray="6 4" />
                </g>
              </motion.g>

              <motion.g
                onMouseEnter={() => setUfoHovered(true)}
                onMouseLeave={() => setUfoHovered(false)}
                animate={floatSwayAnimation}
                transition={{ ...floatSwayTransition, duration: 5.2 }}
              >
                <motion.polygon
                  points="520,175 445,385 595,385"
                  fill="#E2DED9"
                  opacity={ufoHovered ? 0.42 : 0.22}
                  animate={
                    reducedMotion
                      ? { scaleX: 1 }
                      : {
                          scaleX: ufoHovered ? [1, 1.18, 1] : [0.94, 1.06, 0.94],
                          opacity: ufoHovered ? [0.32, 0.55, 0.32] : [0.16, 0.28, 0.16],
                        }
                  }
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ originX: '520px', originY: '175px' }}
                />
                <ellipse
                  cx="520"
                  cy="265"
                  rx={ufoHovered ? 44 : 34}
                  ry="8"
                  fill="none"
                  stroke="#E2DED9"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <ellipse
                  cx="520"
                  cy="325"
                  rx={ufoHovered ? 62 : 48}
                  ry="11"
                  fill="none"
                  stroke="#E2DED9"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
                <path d="M 488 162 C 488 130, 552 130, 552 162 Z" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="3" />
                <ellipse cx="520" cy="166" rx="68" ry="18" fill="#817E7B" stroke="#0D0D0D" strokeWidth="3.5" />
                <ellipse cx="520" cy="166" rx="46" ry="8" fill="#E2DED9" stroke="#0D0D0D" strokeWidth="2" />
                <circle cx="476" cy="166" r="4" fill="#0D0D0D" />
                <circle cx="520" cy="172" r="4" fill="#0D0D0D" />
                <circle cx="564" cy="166" r="4" fill="#0D0D0D" />
              </motion.g>
            </svg>
          </motion.div>
        </>
      )}
    </div>
  );
};
