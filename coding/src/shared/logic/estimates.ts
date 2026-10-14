import { AssignmentType } from '../data/schemas';

export const DEFAULT_ESTIMATES_MINUTES: Record<AssignmentType, number> = {
  discussion: 30,
  reading: 40,
  homework: 45,
  quiz: 60,
  lab: 180,
  essay: 240,
  exam: 180,
  project: 360,
  other: 60,
};

export function getDefaultEstimate(type: AssignmentType): number {
  return DEFAULT_ESTIMATES_MINUTES[type] ?? 60;
}

// A first guess for work brought in from Canvas, where every item would otherwise get the same time for its type.
// Work worth more points than the class's usual item is likely bigger, and a 1-point item is likely small:
// the type's time is scaled by points / the class's median points, kept between a quarter and double, at least 10 minutes.
export function scaledEstimate(type: AssignmentType, points: number | undefined, medianPoints: number | undefined): number {
  const base = getDefaultEstimate(type);
  if (!points || !medianPoints || medianPoints <= 0) return base;
  const factor = Math.min(2, Math.max(0.25, points / medianPoints));
  return Math.max(10, Math.round((base * factor) / 5) * 5);
}

export type SizeClass = 'small' | 'medium' | 'heavy';

export function getSizeClass(estimateMinutes: number): SizeClass {
  if (estimateMinutes <= 30) return 'small';
  if (estimateMinutes <= 90) return 'medium';
  return 'heavy';
}
