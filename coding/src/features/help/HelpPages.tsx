import React from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../shared/components/AppShell';
import { BUILT_IN_TIPS } from '../helpMeStart/templates';

export const HelpOverviewPage: React.FC = () => (
  <AppShell title="How ADHD1X works & Tips">
    <div className="space-y-6 bg-surface p-6 rounded border border-border">
      <section className="space-y-2">
        <h2 className="text-lg font-bold">How ADHD1X works</h2>
        <p className="text-sm">
          ADHD1X builds today&apos;s school plan from your due dates, time estimates, and study blocks using plain, predictable rules. When you tap Help me start, it breaks an assignment into one small 2-minute starting move.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Practical study tips</h2>
        <ul className="space-y-2 text-sm">
          {BUILT_IN_TIPS.map((t) => (
            <li key={t.id} className="p-3 rounded border border-border bg-bg">
              <strong>{t.title}:</strong> {t.body}{' '}
              <span className="text-xs text-muted">[{t.badge}]</span>
            </li>
          ))}
        </ul>
      </section>

      <Link
        to="/help/campus-support"
        className="inline-block underline min-h-[44px] py-2 font-medium"
      >
        Read about campus disability &amp; accessibility services
      </Link>
    </div>
  </AppShell>
);

export const CampusSupportPage: React.FC = () => (
  <AppShell title="Campus disability & accessibility services">
    <div className="space-y-4 bg-surface p-6 rounded border border-border text-sm leading-relaxed">
      <p>
        Most colleges and universities have a Disability Services or Accessibility Services office dedicated to supporting students.
      </p>
      <p>
        You do not need a formal diagnosis just to ask what resources, workshops, or support options are available on your campus.
      </p>
      <h2 className="text-base font-bold pt-2">Examples of common campus accommodations</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>Extended time on quizzes and exams</li>
        <li>A quieter, reduced-distraction testing room</li>
        <li>Note-taking assistance or audio recording permission</li>
        <li>Flexible deadline agreements when arranged in advance</li>
      </ul>
      <p className="text-muted pt-2">
        Reminder: ADHD1X is a study planning tool and cannot diagnose conditions or provide medical, mental health, or treatment advice.
      </p>
    </div>
  </AppShell>
);
