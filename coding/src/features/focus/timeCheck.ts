// Reads the "how long did that take" box. Empty or unusable input means "keep the time as measured".
export function parseMinutesInput(raw: string): number | undefined {
  const n = Number(raw.trim());
  if (!raw.trim() || !Number.isFinite(n) || n < 0) return undefined;
  return Math.min(600, Math.round(n));
}
