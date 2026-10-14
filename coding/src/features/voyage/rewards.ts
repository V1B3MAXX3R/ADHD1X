import { Assignment } from '../../shared/data/schemas';
import { FunFact } from './funFacts';
import { computeVoyageStatus, VOYAGE_POINTS_BY_TYPE } from './voyage';

export interface CompletionReward {
  assignmentName: string;
  pointsEarned: number;
  currentStop: string;
  newlyReachedStop: string | null;
  progressPoints: number;
  totalPoints: number;
  funFact: FunFact;
}

// `before` is the list with the assignment still open; `after` has it marked done.
export function buildCompletionReward(
  before: Assignment[],
  after: Assignment[],
  finished: Assignment,
  funFact: FunFact,
): CompletionReward {
  const beforeStatus = computeVoyageStatus(before);
  const afterStatus = computeVoyageStatus(after, beforeStatus.planetsReached);
  const newlyReached = afterStatus.planetsReached.filter((p) => !beforeStatus.planetsReached.includes(p));
  return {
    assignmentName: finished.name,
    pointsEarned: VOYAGE_POINTS_BY_TYPE[finished.type] ?? 1,
    currentStop: afterStatus.currentStop,
    newlyReachedStop: newlyReached.length > 0 ? newlyReached[newlyReached.length - 1] : null,
    progressPoints: afterStatus.progressPoints,
    totalPoints: afterStatus.totalPoints,
    funFact,
  };
}
