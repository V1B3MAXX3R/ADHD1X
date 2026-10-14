import React from 'react';
import { AppShell } from '../../shared/components/AppShell';
import { useApp } from '../../app/AppContext';
import { useClock } from '../../shared/clock/ClockContext';
import { computeCatchUpPaces } from './catchUp';
import { useCatchUp } from './useCatchUp';
import { ModeSwitch } from './components/ModeSwitch';
import { GradeCalculator } from './components/GradeCalculator';
import { PacePicker } from './components/PacePicker';
import { DueSoonestQueue } from './components/DueSoonestQueue';
import { GradesImportPanel } from '../grades/GradesImportPanel';

export const CatchUpPage: React.FC = () => {
  const { assignments } = useApp();
  const { today } = useClock();
  const { catchUp, isSpace, modeName } = useCatchUp();

  const inView = assignments.filter((a) => catchUp.selectedCourseId === 'all' || a.courseId === catchUp.selectedCourseId);
  const stats = computeCatchUpPaces(inView, { today });

  return (
    <AppShell title={isSpace ? 'Hyperdrive (Catch Up)' : modeName}>
      <div className="space-y-6">
        <ModeSwitch />
        <GradesImportPanel />
        <GradeCalculator assignments={inView} />
        <PacePicker stats={stats} />
        <DueSoonestQueue tasks={stats.dueSoonestTasks} />
      </div>
    </AppShell>
  );
};
