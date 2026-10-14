import { CustomPalette } from '../../shared/data/schemas';

// Contrast rules for a custom palette. A palette is only used if every pair passes, the same pairs
// that scripts/check-contrast.mjs checks for the four built-in palettes (WCAG 1.4.3 and 1.4.11, A3).

export function luminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((pair) => {
      const v = parseInt(pair, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export interface PaletteCheck {
  label: string;
  ratio: number;
  min: number;
  pass: boolean;
}

export function checkPalette(p: CustomPalette): PaletteCheck[] {
  const pairs: [string, string, string, number][] = [
    ['Text on background', p.text, p.bg, 4.5],
    ['Text on panels', p.text, p.surface, 4.5],
    ['Muted text on background', p.muted, p.bg, 4.5],
    ['Muted text on panels', p.muted, p.surface, 4.5],
    ['Button text on button color', p.onAccent, p.accent, 4.5],
    ['Due-soon text on panels', p.dueSoon, p.surface, 4.5],
    ['Focus ring on background', p.focus, p.bg, 3],
    ['Borders on background', p.border, p.bg, 3],
  ];
  return pairs.map(([label, fg, bg, min]) => {
    const ratio = contrastRatio(fg, bg);
    return { label, ratio: Math.round(ratio * 10) / 10, min, pass: ratio >= min };
  });
}

export function paletteProblems(p: CustomPalette): PaletteCheck[] {
  return checkPalette(p).filter((c) => !c.pass);
}

// Black or white, whichever is easier to read on this color.
export function readableOn(bg: string): '#000000' | '#FFFFFF' {
  return contrastRatio('#000000', bg) >= contrastRatio('#FFFFFF', bg) ? '#000000' : '#FFFFFF';
}

const CSS_VARS: Record<Exclude<keyof CustomPalette, 'name'>, string> = {
  bg: '--color-bg',
  surface: '--color-surface',
  text: '--color-text',
  muted: '--color-muted',
  accent: '--color-accent',
  onAccent: '--color-on-accent',
  focus: '--color-focus',
  dueSoon: '--color-due-soon',
  border: '--color-border',
};

// Sets the palette on the page, or clears it. A palette that fails the checks is never applied,
// even if it came from an imported file.
export function applyCustomPalette(p: CustomPalette | null): void {
  const style = document.documentElement.style;
  const usable = p && paletteProblems(p).length === 0 ? p : null;
  for (const [key, cssVar] of Object.entries(CSS_VARS)) {
    if (usable) style.setProperty(cssVar, usable[key as keyof typeof CSS_VARS]);
    else style.removeProperty(cssVar);
  }
}
