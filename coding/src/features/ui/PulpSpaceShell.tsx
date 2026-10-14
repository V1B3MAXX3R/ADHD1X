import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { useApp, getCurrentBlockName } from '../../app/AppContext';
import { AppShell } from '../../shared/components/AppShell';
import { computeVoyageStatus, VOYAGE_POINTS_BY_TYPE, VOYAGE_STOPS } from '../voyage/voyage';
import { pickRandomFunFact } from '../voyage/funFacts';
import { LogItem, ParallaxState, TabConfig, TabId } from './types';
import { SectorTabs } from './components/SectorTabs';
import { VectorStage } from './components/VectorStage';
import { HeroTypography } from './components/HeroTypography';
import { ContentGrid } from './components/ContentGrid';
import { Footer } from './components/Footer';
import './halftone.css';

const MAX_SUMMARY = 180;

// The Cosmos view: a retro pulp-comic way to look at the same voyage, hyperdrive and starter-timer data.
// It sits inside the normal page shell, so the menu, timer bar, clock and reward pop-up all keep working.
export const PulpSpaceShell: React.FC = () => {
  const { settings, assignments, courses, updateSettings, completeAssignmentWithReward, startTimer, timer } = useApp();

  const [activeTab, setActiveTab] = useState<TabId>('planetary-bodies');
  const [activeFact, setActiveFact] = useState(() => pickRandomFunFact());
  const [parallax, setParallax] = useState<ParallaxState>({
    normX: 0,
    normY: 0,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1280,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
    isPointerInside: false,
  });

  // Both the app's Motion setting and the system's reduced-motion setting turn animation off (A74).
  const systemReduced = useReducedMotion();
  const reducedMotion = !settings.motion || Boolean(systemReduced);

  useEffect(() => {
    const onResize = () =>
      setParallax((prev) => ({ ...prev, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const rawX = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
      const rawY = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
      setParallax((prev) => ({
        ...prev,
        normX: Math.max(-0.5, Math.min(0.5, rawX)),
        normY: Math.max(-0.5, Math.min(0.5, rawY)),
        isPointerInside: true,
      }));
    },
    [reducedMotion],
  );

  const handlePointerLeave = useCallback(() => {
    setParallax((prev) => ({ ...prev, normX: 0, normY: 0, isPointerInside: false }));
  }, []);

  const voyageStatus = useMemo(() => computeVoyageStatus(assignments), [assignments]);
  const voyageRatio =
    voyageStatus.totalPoints > 0 ? Math.min(1, voyageStatus.progressPoints / voyageStatus.totalPoints) : 0;

  const activeTodoTasks = useMemo(
    () =>
      assignments
        .filter((a) => a.status !== 'done' && !a.notNow)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [assignments],
  );
  const topTask = activeTodoTasks[0] ?? null;

  // Real assignments first; the sample logs only show when there are none.
  const liveAssignmentLogs = useMemo<LogItem[]>(
    () =>
      activeTodoTasks.slice(0, 3).map((a, idx) => {
        const course = courses.find((c) => c.id === a.courseId);
        const pts = VOYAGE_POINTS_BY_TYPE[a.type] ?? 1;
        const left = Math.max(5, a.estimateMinutes - (a.minutesLogged ?? 0));
        const details = a.detailsText?.trim();
        return {
          id: a.id,
          code: `MSN-0${idx + 1}`,
          title: a.name,
          sector: course?.name?.toUpperCase() ?? 'GENERAL',
          timestamp: `DUE ${a.dueDate} • ABOUT ${left} MIN LEFT`,
          status: 'PRIORITY',
          summary: details
            ? details.length > MAX_SUMMARY
              ? `${details.slice(0, MAX_SUMMARY)}...`
              : details
            : `A ${a.type} task. Finishing it adds ${pts} voyage points.`,
          thrustPoints: pts,
          assignmentId: a.id,
          assignmentType: a.type,
        };
      }),
    [activeTodoTasks, courses],
  );

  const catchUp = settings.catchUp;
  const paceLabel = catchUp.pace.toUpperCase();

  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'planetary-bodies',
        label: 'Planets',
        issueNumber: 'SECTION 01 // THE VOYAGE',
        headline: 'Solar system voyage',
        subheadline: `SHIP AT: ${voyageStatus.currentStop.toUpperCase()}`,
        description:
          'Each assignment you finish moves your ship forward from the Moon toward Neptune. Progress only moves forward. Nothing resets or fades if you take time away.',
        metricsBarText: `Current stop: ${voyageStatus.currentStop}`,
        metrics: [
          {
            label: 'Stops reached',
            value: `${voyageStatus.planetsReached.length} of ${VOYAGE_STOPS.length}`,
          },
          { label: 'Voyage points', value: `${voyageStatus.progressPoints} / ${voyageStatus.totalPoints}` },
          { label: 'Tasks waiting', value: String(activeTodoTasks.length) },
        ],
        ctaLabel: 'Open the voyage map',
        ctaRoute: '/voyage',
        logs:
          liveAssignmentLogs.length > 0
            ? liveAssignmentLogs
            : [
                {
                  id: 'p-log-1',
                  code: 'ORB-101',
                  title: 'Add your courses',
                  sector: 'LAUNCH PAD',
                  timestamp: 'SAMPLE ENTRY',
                  status: 'NOMINAL',
                  summary:
                    'Add a course and its assignments and your real tasks show up here as mission cards.',
                  thrustPoints: 3,
                },
                {
                  id: 'p-log-2',
                  code: 'ORB-102',
                  title: 'Progress never fades',
                  sector: 'SATURN RING B',
                  timestamp: 'SAMPLE ENTRY',
                  status: 'NOMINAL',
                  summary: 'Finished assignments stay finished. Taking weeks off never sends your ship backward.',
                  thrustPoints: 4,
                },
                {
                  id: 'p-log-3',
                  code: 'ORB-103',
                  title: 'Start small',
                  sector: 'STOP 01: MOON',
                  timestamp: 'SAMPLE ENTRY',
                  status: 'COMPLETED',
                  summary: 'Help me start gives you one first move of about 2 minutes. Stopping early is always fine.',
                },
              ],
      },
      {
        id: 'deep-space',
        label: 'Deep space',
        issueNumber: 'SECTION 02 // HYPERDRIVE',
        headline: 'Hyperdrive catch-up',
        subheadline: catchUp.on ? 'HYPERDRIVE: ON' : 'HYPERDRIVE: OFF',
        description:
          'When coursework piles up, Hyperdrive works out the points you need for a target grade on this device and lets you pick a pace: Aggressive, Normal or Chill. It only turns on when you switch it on.',
        metricsBarText: `Target grade ${catchUp.targetGrade}% at a ${paceLabel} pace`,
        metrics: [
          { label: 'Hyperdrive', value: catchUp.on ? 'On' : 'Off' },
          { label: 'Pace', value: paceLabel },
          { label: 'Grades', value: 'Stay on this device' },
        ],
        ctaLabel: 'Open Hyperdrive',
        ctaRoute: '/catch-up',
        logs: [
          {
            id: 'ds-log-1',
            code: 'VOID-201',
            title: 'Grades stay private',
            sector: 'PRIVATE CORE',
            timestamp: 'HOW IT WORKS',
            status: 'NOMINAL',
            summary:
              'Your grades and scores are worked out in your browser and are never sent to Gemini.',
          },
          {
            id: 'ds-log-2',
            code: 'VOID-202',
            title: 'Due within 24 hours comes first',
            sector: 'PLAN ENGINE',
            timestamp: 'HOW IT WORKS',
            status: 'PRIORITY',
            summary:
              'Assignments due within 24 hours move to the front of your plan. The wording stays plain, with no alarm colors.',
          },
          {
            id: 'ds-log-3',
            code: 'VOID-203',
            title: 'Room to breathe',
            sector: 'PLAN ENGINE',
            timestamp: 'HOW IT WORKS',
            status: 'NOMINAL',
            summary:
              'Each study block keeps about 15% free for tasks that take longer than planned, and Today asks before a second long day in a row.',
          },
        ],
      },
      {
        id: 'exploration-scifi',
        label: 'Exploration',
        issueNumber: 'SECTION 03 // GETTING STARTED',
        headline: 'Start in two minutes',
        subheadline: `MAJOR: ${(settings.major || 'GENERAL STUDIES').toUpperCase()}`,
        description:
          'Beat the hard part, starting. Help me start gives you one concrete first move, and Gemini can tune your plan to your major when AI Mode is on.',
        metricsBarText: `Starter timer: ${settings.starterMinutes} min`,
        metrics: [
          { label: 'Starter timer', value: `${settings.starterMinutes} min` },
          { label: 'Courses', value: String(courses.length) },
          { label: 'AI Mode', value: settings.aiModeEnabled ? 'On' : 'Off (built-in only)' },
        ],
        ctaLabel: topTask ? `Help me start: ${topTask.name}` : 'Open Today',
        ctaRoute: topTask ? `/start/${topTask.id}` : '/today',
        logs: [
          {
            id: 'ex-log-1',
            code: 'EVA-301',
            title: 'A first move that takes 2 minutes',
            sector: 'STARTER BAY',
            timestamp: `${settings.starterMinutes} MIN TIMER`,
            status: 'NOMINAL',
            summary:
              'Pick bite-sized, half or the full thing and get one first move. Built-in templates cover you when Gemini is off.',
          },
          {
            id: 'ex-log-2',
            code: 'EVA-302',
            title: 'Make it clear, and email your professor',
            sector: 'ASSIGNMENT DETAILS',
            timestamp: 'GEMINI OR BUILT-IN',
            status: 'NOMINAL',
            summary:
              'Turn dense instructions into a plain checklist, or draft a polite email with a formal or friendly tone.',
          },
          {
            id: 'ex-log-3',
            code: 'EVA-303',
            title: 'Where was I, and the parking lot',
            sector: 'FOCUS TOOLS',
            timestamp: 'ON THIS DEVICE',
            status: 'COMPLETED',
            summary:
              'Leave a one-line note when you stop, and park stray thoughts from the timer bar without switching tabs.',
          },
        ],
      },
    ],
    [voyageStatus, settings, courses.length, liveAssignmentLogs, topTask, activeTodoTasks.length, catchUp, paceLabel],
  );

  const currentTab = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const showFact = settings.interfaceStyle === 'space';

  return (
    <AppShell title="Cosmos" wide noHero>
      <div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="pulp-shell pulp-halftone-surface p-3 sm:p-4"
      >
        <SectorTabs
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          reducedMotion={reducedMotion}
          hyperdriveOn={catchUp.on}
          aiModeOn={settings.aiModeEnabled}
          onToggleAiMode={() => void updateSettings({ aiModeEnabled: !settings.aiModeEnabled }, true)}
        />

        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="pt-6 pb-2"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 z-20">
              <AnimatePresence mode="wait">
                <HeroTypography
                  key={currentTab.id}
                  tab={currentTab}
                  reducedMotion={reducedMotion}
                  quickStartName={topTask && !timer.running ? topTask.name : null}
                  onQuickStart={
                    topTask && !timer.running
                      ? () => startTimer(topTask.id, settings.starterMinutes, getCurrentBlockName(settings))
                      : undefined
                  }
                />
              </AnimatePresence>
            </div>

            <div className="lg:col-span-6 z-10">
              <AnimatePresence mode="wait">
                <VectorStage
                  key={currentTab.id}
                  activeTab={currentTab.id}
                  parallax={parallax}
                  reducedMotion={reducedMotion}
                  currentVoyageStop={voyageStatus.currentStop}
                  voyageProgressRatio={voyageRatio}
                />
              </AnimatePresence>
            </div>
          </div>

          <ContentGrid
            logs={currentTab.logs}
            funFact={showFact ? activeFact : null}
            onNextFunFact={() => setActiveFact((prev) => pickRandomFunFact(prev.id))}
            onCompleteAssignment={(id) => {
              const found = assignments.find((a) => a.id === id);
              if (found) void completeAssignmentWithReward(found);
            }}
          />
        </div>

        {!settings.cosmosLook && (
          <Footer
            parallax={parallax}
            motionPaused={!settings.motion}
            onToggleMotion={() => void updateSettings({ motion: !settings.motion }, true)}
            cosmosLook={settings.cosmosLook}
            onToggleCosmosLook={() => void updateSettings({ cosmosLook: !settings.cosmosLook }, true)}
            currentStop={voyageStatus.currentStop}
            progressPoints={voyageStatus.progressPoints}
            totalPoints={voyageStatus.totalPoints}
          />
        )}
      </div>
    </AppShell>
  );
};
