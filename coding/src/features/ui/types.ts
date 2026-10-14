import { AssignmentType } from '../../shared/data/schemas';

export type TabId = 'planetary-bodies' | 'deep-space' | 'exploration-scifi';

export interface ParallaxState {
  /** Pointer X position across the page, from -0.5 to 0.5 */
  normX: number;
  /** Pointer Y position across the page, from -0.5 to 0.5 */
  normY: number;
  viewportWidth: number;
  viewportHeight: number;
  isPointerInside: boolean;
}

export interface LogItem {
  id: string;
  code: string;
  title: string;
  sector: string;
  timestamp: string;
  status: 'NOMINAL' | 'PRIORITY' | 'COMPLETED' | 'ARCHIVED';
  summary: string;
  thrustPoints?: number;
  assignmentId?: string;
  assignmentType?: AssignmentType;
}

export interface MetricChip {
  label: string;
  value: string;
}

export interface TabConfig {
  id: TabId;
  label: string;
  issueNumber: string;
  headline: string;
  subheadline: string;
  description: string;
  metricsBarText: string;
  metrics: MetricChip[];
  ctaLabel: string;
  ctaRoute: string;
  logs: LogItem[];
}
