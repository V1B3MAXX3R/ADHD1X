const PALETTES = {
  lowLight: { bg: '#F6F3EE', surface: '#FFFFFF', text: '#26231F', muted: '#5A554D', accent: '#2F6168', onAccent: '#FFFFFF', focus: '#1B4FA3', dueSoon: '#8A4B08', border: '#8C857A' },
  lowDim:   { bg: '#1E1D1B', surface: '#2A2825', text: '#EDE8E0', muted: '#BDB6AB', accent: '#7FB8BF', onAccent: '#1E1D1B', focus: '#8DB8FF', dueSoon: '#F0B36A', border: '#8F887C' },
  space:    { bg: '#0F1430', surface: '#1A2147', text: '#EEF0FA', muted: '#B8BEDD', accent: '#5FD0C4', onAccent: '#0F1430', focus: '#FFD66B', dueSoon: '#FFB454', border: '#8A93C4' },
  standard: { bg: '#FFFFFF', surface: '#F3F5F9', text: '#1B1F2A', muted: '#4B5565', accent: '#1F5FBF', onAccent: '#FFFFFF', focus: '#B54708', dueSoon: '#8A4B08', border: '#7A8394' },
};

function lum(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map((x) => {
    const v = parseInt(x, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function ratio(a, b) {
  const l1 = lum(a);
  const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

let failed = false;
for (const [name, p] of Object.entries(PALETTES)) {
  const checks = [
    ['text on bg', ratio(p.text, p.bg), 4.5],
    ['text on surface', ratio(p.text, p.surface), 4.5],
    ['muted on bg', ratio(p.muted, p.bg), 4.5],
    ['muted on surface', ratio(p.muted, p.surface), 4.5],
    ['onAccent on accent', ratio(p.onAccent, p.accent), 4.5],
    ['dueSoon on surface', ratio(p.dueSoon, p.surface), 4.5],
    ['focus on bg', ratio(p.focus, p.bg), 3.0],
    ['border on bg', ratio(p.border, p.bg), 3.0],
  ];
  for (const [label, r, min] of checks) {
    if (r < min) {
      console.error(`[FAIL] ${name} ${label}: ${r.toFixed(2)} < ${min}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('Contrast check passed for all 4 palettes (WCAG 1.4.3 & 1.4.11).');
