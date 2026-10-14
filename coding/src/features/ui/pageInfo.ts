import { TabId } from './types';

export interface PageInfo {
  /** Which illustration the page header shows */
  tab: TabId;
  /** Small label above the headline */
  section: string;
  /** One plain sentence under the headline */
  tagline: string;
}

const PAGES: [prefix: string, info: PageInfo][] = [
  ['/today', { tab: 'exploration-scifi', section: 'SECTION 01 // TODAY', tagline: 'Your plan for right now, in plain steps.' }],
  ['/start', { tab: 'exploration-scifi', section: 'SECTION 01 // FIRST MOVE', tagline: 'One small first move. Stopping early is always fine.' }],
  ['/assignments', { tab: 'planetary-bodies', section: 'SECTION 02 // ASSIGNMENTS', tagline: 'Everything that is due, in one list.' }],
  ['/calendar', { tab: 'deep-space', section: 'SECTION 03 // CALENDAR', tagline: 'Imported dates and events, kept on this device.' }],
  ['/voyage', { tab: 'planetary-bodies', section: 'SECTION 04 // PROGRESS', tagline: 'Your ship only moves forward. Nothing resets.' }],
  ['/catch-up', { tab: 'deep-space', section: 'SECTION 05 // CATCH UP', tagline: 'A calm way to catch up, only when you choose it.' }],
  ['/settings', { tab: 'exploration-scifi', section: 'SECTION 06 // SETTINGS', tagline: 'Make the app fit the way you work.' }],
  ['/help', { tab: 'planetary-bodies', section: 'SECTION 07 // HELP', tagline: 'How it works, and tips that students find useful.' }],
  ['/setup', { tab: 'planetary-bodies', section: 'SETUP', tagline: 'Add your courses so the plan can fit them.' }],
];

const FALLBACK: PageInfo = {
  tab: 'planetary-bodies',
  section: 'ADHD1X // PULP COSMOS',
  tagline: 'A school-day helper that stays on your side.',
};

export function pageInfoFor(pathname: string): PageInfo {
  return PAGES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? FALLBACK;
}
