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

export type SizeClass = 'small' | 'medium' | 'heavy';

export function getSizeClass(estimateMinutes: number): SizeClass {
  if (estimateMinutes <= 30) return 'small';
  if (estimateMinutes <= 90) return 'medium';
  return 'heavy';
}
