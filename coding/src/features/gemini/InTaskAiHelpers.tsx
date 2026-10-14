import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { Assignment } from '../../shared/data/schemas';
import { useAiCall } from './useAiCall';

interface PracticeQuestion {
  question: string;
  hint: string;
  answer: string;
}

// Two optional helpers under the first move in Help me start: split one stuck step into smaller
// pieces, and a few warm-up practice questions for quizzes, exams and readings.
export const InTaskAiHelpers: React.FC<{
  assignment: Assignment;
  courseName: string;
  currentStepText: string;
}> = ({ assignment, courseName, currentStepText }) => {
  const { settings } = useApp();
  const { loading, notice, run } = useAiCall();
  const [microSteps, setMicroSteps] = useState<string[] | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[] | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  if (!settings.aiModeEnabled) return null;

  const canPractice = ['quiz', 'exam', 'reading'].includes(assignment.type);

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || !currentStepText}
          onClick={() =>
            run<{ microSteps: string[] }>(
              'microUnstick',
              { assignmentName: assignment.name, stuckStep: currentStepText, major: settings.major },
              (d) => setMicroSteps(d.microSteps),
            )
          }
          className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-xs font-medium"
        >
          Break this step into 3 smaller pieces (Uses Gemini)
        </button>

        {canPractice && (
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              run<{ questions: PracticeQuestion[] }>(
                'practiceQuiz',
                {
                  assignmentName: assignment.name,
                  courseName,
                  detailsText: assignment.detailsText || assignment.name,
                },
                (d) => {
                  setQuestions(d.questions);
                  setRevealed(new Set());
                },
              )
            }
            className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-xs font-medium"
          >
            Give me 3 warm-up practice questions (Uses Gemini)
          </button>
        )}
      </div>

      {loading && <p role="status" className="text-xs text-muted">Working on it...</p>}
      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {microSteps && (
        <div className="p-3 rounded border border-accent bg-bg space-y-1 text-sm">
          <h3 className="font-bold">Smaller pieces for this step</h3>
          <ol className="list-decimal list-inside space-y-1">
            {microSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {questions && (
        <div className="p-3 rounded border border-accent bg-bg space-y-3 text-sm">
          <h3 className="font-bold">Warm-up practice questions</h3>
          {questions.map((q, i) => (
            <div key={i} className="p-2 rounded bg-surface border border-border space-y-1">
              <p className="font-medium">
                {i + 1}. {q.question}
              </p>
              <p className="text-muted">Hint: {q.hint}</p>
              {revealed.has(i) ? (
                <p className="text-accent font-bold">Answer: {q.answer}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevealed(new Set(revealed).add(i))}
                  className="underline text-accent min-h-[44px]"
                >
                  Show answer
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
