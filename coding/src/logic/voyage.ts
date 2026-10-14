import { Assignment, AssignmentType } from '../data/schemas';

export const VOYAGE_POINTS_BY_TYPE: Record<AssignmentType, number> = {
  discussion: 1,
  reading: 1,
  homework: 1,
  quiz: 1,
  lab: 2,
  essay: 3,
  exam: 3,
  project: 4,
  other: 1,
};

export const VOYAGE_STOPS = [
  'Moon',
  'Mars',
  'Asteroid Belt',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
] as const;

export type VoyageStop = (typeof VOYAGE_STOPS)[number];

export interface VoyageStatus {
  progressPoints: number;
  totalPoints: number;
  planetsReached: string[];
  currentStop: string;
}

export function computeVoyageStatus(
  assignments: Assignment[],
  previouslyReached: string[] = [],
): VoyageStatus {
  let progressPoints = 0;
  let totalPoints = 0;

  for (const a of assignments) {
    const pts = VOYAGE_POINTS_BY_TYPE[a.type] ?? 1;
    totalPoints += pts;
    if (a.status === 'done') {
      progressPoints += pts;
    }
  }

  const reachedSet = new Set<string>(previouslyReached);
  if (totalPoints > 0) {
    for (let k = 1; k <= VOYAGE_STOPS.length; k++) {
      const threshold = (k / VOYAGE_STOPS.length) * totalPoints;
      if (progressPoints + 1e-9 >= threshold) {
        reachedSet.add(VOYAGE_STOPS[k - 1]);
      }
    }
  }

  const orderedReached = VOYAGE_STOPS.filter((s) => reachedSet.has(s));
  const currentStop =
    orderedReached.length > 0 ? orderedReached[orderedReached.length - 1] : 'Earth Orbit';

  return {
    progressPoints,
    totalPoints,
    planetsReached: orderedReached,
    currentStop,
  };
}
