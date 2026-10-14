import React, { useMemo, useState } from 'react';
import { AppShell } from '../../shared/components/AppShell';
import { useApp } from '../../app/AppContext';
import { useClock } from '../../shared/clock/ClockContext';
import { withOverride, WhatIfOverrides } from './studyPlan';
import { buildCatchUpModel } from './catchUpModel';
import { useCatchUp } from './useCatchUp';
import { TermBar } from '../planning/TermBar';
import { ModeSwitch } from './components/ModeSwitch';
import { CourseChooser } from './components/CourseChooser';
import { LateWorkSection } from './components/LateWorkSection';
import { PacePicker } from './components/PacePicker';
import { CGoalCard } from './components/CGoalCard';
import { StudyPlan } from './components/StudyPlan';
import { GradeCalculator, WhatIfControls } from './components/GradeCalculator';
import { DueDateView } from './components/DueDateView';
import { GradingSection } from './components/GradingSection';
import { GradesImportPanel } from '../grades/GradesImportPanel';

export const CatchUpPage: React.FC = () => {
  const { assignments, courses, settings } = useApp();
  const { now, today } = useClock();
  const { catchUp, isSpace, modeName } = useCatchUp();
  const [overrides, setOverrides] = useState<WhatIfOverrides>({});
  const [fullPlan, setFullPlan] = useState(false);

  // Everything is worked out once, in one place, and every section below reads from it. The order follows the
  // reasoning: your classes and how they are graded, what each class needs for a C and when it is due, then the pace
  // (set up from all of that), then the plan.
  const model = useMemo(
    () => buildCatchUpModel({ assignments, courses, settings, today, now }),
    [assignments, courses, settings, today, now],
  );
  const chosen = model.paces[catchUp.pace];
  const plan = fullPlan ? chosen.allPlan : chosen.cPlan;

  const whatIf: WhatIfControls = {
    overrides,
    count: Object.keys(overrides).length,
    setValue: (a, field, value) => setOverrides((o) => withOverride(o, a, field, value)),
    reset: () => setOverrides({}),
  };

  return (
    <AppShell title={isSpace ? 'Hyperdrive (Catch Up)' : modeName}>
      <div className="space-y-6">
        <ModeSwitch />
        <TermBar />
        <GradesImportPanel />
        <CourseChooser selectedIds={model.selectedIds} />
        <GradingSection courses={model.activeCourses} assignments={model.inView} />
        <LateWorkSection courses={model.activeCourses} assignments={model.inView} now={now} />
        <CGoalCard model={model} today={today} />
        <DueDateView model={model} plan={plan} today={today} now={now} />
        <PacePicker model={model} today={today} />
        <StudyPlan
          plan={plan}
          today={today}
          now={now}
          pace={catchUp.pace}
          courses={courses}
          minutesPerDay={chosen.minutesPerDay}
          mode={settings.term.mode}
          fullPlan={fullPlan}
          onFullPlanChange={setFullPlan}
        />
        <GradeCalculator
          courses={model.activeCourses}
          assignments={model.inView}
          reopenedIds={model.reopenedIds}
          whatIf={whatIf}
          plannedLateIds={plan.afterDueIds}
          now={now}
        />
      </div>
    </AppShell>
  );
};
