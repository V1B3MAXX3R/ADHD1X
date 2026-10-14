import React from 'react';
import { Course } from '../../shared/data/schemas';
import { courseGrading } from '../catchUp/gradeBook';

const shortDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const UNAVAILABLE_LABELS: Record<string, string> = {
  groups: 'categories and weights',
  gradingStandard: 'letter scale',
  latePolicy: 'late policy',
  announcements: 'announcements',
};

// What the Canvas tool brought in about one class: how it is graded, the late policy, the syllabus and recent
// announcements. All text is shown as plain text. Stays on this device; grades are never sent to Gemini (A36).
export const CanvasClassInfo: React.FC<{ course: Course }> = ({ course }) => {
  const info = course.canvas;
  if (!info) return null;
  const grading = courseGrading(course);
  const late = info.latePolicy;
  const dropNotes = info.groups
    .filter((g) => g.dropLowest > 0 || g.dropHighest > 0)
    .map((g) =>
      [g.dropLowest > 0 ? `drops the lowest ${g.dropLowest}` : '', g.dropHighest > 0 ? `drops the highest ${g.dropHighest}` : '']
        .filter(Boolean)
        .join(' and ') + ` in ${g.name}`,
    );
  const hidden = info.unavailable.map((u) => UNAVAILABLE_LABELS[u] ?? u);

  return (
    <details className="rounded border border-border bg-surface">
      <summary className="min-h-[44px] px-3 py-2 cursor-pointer font-medium flex items-center">
        From Canvas{info.currentScore !== null && info.currentScore !== undefined ? `: ${info.currentScore}%${info.currentGrade ? ` (${info.currentGrade})` : ''}` : ''}
      </summary>
      <div className="p-3 space-y-2 text-sm">
        <ul className="space-y-1">
          <li>
            {info.hideFinalGrades
              ? 'This class hides its total grade in Canvas.'
              : info.currentScore !== null && info.currentScore !== undefined
                ? `Grade in Canvas: ${info.currentScore}%${info.currentGrade ? ` (${info.currentGrade})` : ''} on graded work.`
                : 'Canvas did not show a total grade for this class.'}
            {info.finalScore !== null && info.finalScore !== undefined && !info.hideFinalGrades
              ? ` If nothing else is turned in: ${info.finalScore}%${info.finalGrade ? ` (${info.finalGrade})` : ''}.`
              : ''}
          </li>
          <li>
            {grading.weighted
              ? `Graded by category weights: ${info.groups.filter((g) => g.weight > 0).map((g) => `${g.name} ${g.weight}%`).join(', ')}.`
              : 'Graded by points.'}
            {dropNotes.length > 0 ? ` Canvas ${dropNotes.join('; ')}.` : ''}
          </li>
          <li>
            {grading.cSource === 'yours'
              ? `A C here starts at ${grading.cPercent}% (your grading setup).`
              : grading.cSource === 'canvas'
                ? `A C here starts at ${grading.cPercent}% (the class's letter scale).`
                : `Canvas did not share a letter scale, so a C is taken as ${grading.cPercent}%. You can set it under Grading.`}
          </li>
          {late && (
            <li>
              {late.lateDeductionEnabled && late.lateDeductionPercent !== null
                ? `Canvas late policy: ${late.lateDeductionPercent}% off per ${late.lateInterval ?? 'day'} late${
                    late.lateMinimumEnabled && late.lateMinimumPercent !== null ? `, never below ${late.lateMinimumPercent}%` : ''
                  }.`
                : 'Canvas takes nothing off automatically for late work.'}
              {late.missingDeductionEnabled && late.missingDeductionPercent !== null
                ? ` Missing work gets ${100 - late.missingDeductionPercent}% automatically.`
                : ''}{' '}
              Pick the closest choice above.
            </li>
          )}
          {info.moduleProgress && (
            <li>
              Modules: {info.moduleProgress.completed} of {info.moduleProgress.total} steps done.
            </li>
          )}
          {hidden.length > 0 && <li className="text-muted">Not shared with students in Canvas: {hidden.join(', ')}.</li>}
        </ul>

        {info.announcements.length > 0 && (
          <details className="rounded border border-border bg-bg">
            <summary className="min-h-[44px] px-3 py-2 cursor-pointer font-medium flex items-center">
              Recent announcements ({info.announcements.length})
            </summary>
            <ul className="p-3 space-y-3">
              {info.announcements.map((a) => (
                <li key={a.id}>
                  <p className="font-medium">
                    {a.title} <span className="text-xs text-muted">{shortDate(a.postedAt)}</span>
                  </p>
                  {a.text && <p className="whitespace-pre-wrap text-muted">{a.text}</p>}
                </li>
              ))}
            </ul>
          </details>
        )}

        {info.syllabusText && (
          <details className="rounded border border-border bg-bg">
            <summary className="min-h-[44px] px-3 py-2 cursor-pointer font-medium flex items-center">Syllabus</summary>
            <div
              tabIndex={0}
              role="region"
              aria-label={`Syllabus for ${course.name}`}
              className="p-3 whitespace-pre-wrap max-h-80 overflow-y-auto text-muted"
            >
              {info.syllabusText}
            </div>
          </details>
        )}

        <p className="text-xs text-muted">From your Canvas file of {shortDate(info.fetchedAt)}. Re-import it to refresh.</p>
      </div>
    </details>
  );
};
