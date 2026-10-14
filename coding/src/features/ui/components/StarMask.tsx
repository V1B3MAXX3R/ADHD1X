import React, { useMemo } from 'react';
import { motion, SpringOptions, useSpring, useTransform } from 'framer-motion';
import { ParallaxState, TabId } from '../types';

interface StarMaskProps {
  activeTab: TabId;
  parallax: ParallaxState;
  reducedMotion: boolean;
}

interface StarCoord {
  id: string;
  cx: number;
  cy: number;
  r: number;
  stippleRing?: boolean;
}

const SPRING_CONFIG: SpringOptions = { stiffness: 120, damping: 24, mass: 0.8 };

// The black "window" shape and stippled starfield behind each section's picture.
export const StarMask: React.FC<StarMaskProps> = ({ activeTab, parallax, reducedMotion }) => {
  // Fixed star positions, so the sky looks the same every visit
  const stars = useMemo<StarCoord[]>(() => {
    const list: StarCoord[] = [];
    for (let i = 0; i < 68; i++) {
      const seed = (i * 9301 + 49297) % 233280;
      const seed2 = (i * 4211 + 19873) % 233280;
      list.push({
        id: `star-${i}`,
        cx: Math.round(40 + (seed / 233280) * 720),
        cy: Math.round(30 + (seed2 / 233280) * 460),
        r: i % 9 === 0 ? 2.8 : i % 3 === 0 ? 1.8 : 1.1,
        stippleRing: i % 11 === 0,
      });
    }
    return list;
  }, []);

  const rawX = reducedMotion ? 0 : parallax.normX * parallax.viewportWidth * 0.008;
  const rawY = reducedMotion ? 0 : parallax.normY * parallax.viewportHeight * 0.008;

  const springX = useSpring(rawX, SPRING_CONFIG);
  const springY = useSpring(rawY, SPRING_CONFIG);

  React.useEffect(() => {
    springX.set(rawX);
    springY.set(rawY);
  }, [rawX, rawY, springX, springY]);

  const innerStarOffsetX = useTransform(springX, (v) => v * -1.4);
  const innerStarOffsetY = useTransform(springY, (v) => v * -1.4);

  const renderMaskPath = () => {
    if (activeTab === 'planetary-bodies') {
      return (
        <path
          d="M 95 90 C 210 20, 610 15, 710 105 C 790 190, 775 370, 680 445 C 560 515, 220 505, 110 430 C 25 355, 15 170, 95 90 Z"
          fill="#0D0D0D"
        />
      );
    }
    if (activeTab === 'deep-space') {
      return (
        <g fill="#0D0D0D">
          <path d="M 70 140 C 165 30, 390 25, 480 110 C 570 30, 735 65, 760 195 C 785 320, 695 470, 535 475 C 425 480, 360 415, 260 465 C 125 510, 35 405, 45 270 C 50 205, 35 180, 70 140 Z" />
          <circle cx="145" cy="95" r="48" />
          <circle cx="675" cy="425" r="54" />
        </g>
      );
    }
    return (
      <path
        d="M 60 475 L 60 185 C 60 55, 740 55, 740 185 L 740 475 C 540 495, 260 495, 60 475 Z"
        fill="#0D0D0D"
      />
    );
  };

  return (
    <motion.div
      style={{ x: springX, y: springY }}
      className="relative w-full h-full flex items-center justify-center select-none"
      aria-hidden="true"
    >
      <svg viewBox="0 0 800 520" className="w-full h-auto max-h-[540px] drop-shadow-[8px_8px_0px_#6A6966]">
        <defs>
          <pattern
            id="woodcut-crosshatch"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#6A6966" strokeWidth="1" opacity="0.35" />
          </pattern>
          <clipPath id={`portal-clip-${activeTab}`}>{renderMaskPath()}</clipPath>
        </defs>

        <g transform="translate(8, 8)" opacity="0.45">
          {renderMaskPath()}
        </g>
        {renderMaskPath()}

        <g clipPath={`url(#portal-clip-${activeTab})`}>
          <rect x="0" y="0" width="800" height="520" fill="#0D0D0D" />
          <rect x="0" y="0" width="800" height="520" fill="url(#woodcut-crosshatch)" />

          <g stroke="#6A6966" strokeWidth="0.75" strokeDasharray="4 6" fill="none" opacity="0.55">
            <circle cx="400" cy="260" r="110" />
            <circle cx="400" cy="260" r="195" />
            <circle cx="400" cy="260" r="285" />
            <line x1="40" y1="260" x2="760" y2="260" />
            <line x1="400" y1="20" x2="400" y2="500" />
          </g>

          <motion.g style={{ x: innerStarOffsetX, y: innerStarOffsetY }}>
            {stars.map((s) => (
              <g key={s.id}>
                <circle cx={s.cx} cy={s.cy} r={s.r} fill="#E2DED9" />
                {s.stippleRing && (
                  <>
                    <circle
                      cx={s.cx}
                      cy={s.cy}
                      r={s.r + 3.5}
                      fill="none"
                      stroke="#817E7B"
                      strokeWidth="0.9"
                      strokeDasharray="1.5 2"
                    />
                    <line x1={s.cx - 7} y1={s.cy} x2={s.cx + 7} y2={s.cy} stroke="#E2DED9" strokeWidth="0.8" />
                    <line x1={s.cx} y1={s.cy - 7} x2={s.cx} y2={s.cy + 7} stroke="#E2DED9" strokeWidth="0.8" />
                  </>
                )}
              </g>
            ))}
          </motion.g>
        </g>

        <g fill="none" stroke="#E2DED9" strokeWidth="1.5" opacity="0.35">
          <rect x="22" y="22" width="756" height="476" rx="14" />
        </g>
      </svg>
    </motion.div>
  );
};
