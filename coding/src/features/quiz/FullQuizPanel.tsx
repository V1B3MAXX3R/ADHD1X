import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { QUIZ_QUESTIONS } from './quizRules';

type Tier = 'Basic' | 'Standard' | 'Detailed' | 'Full';
const TIERS: Tier[] = ['Basic', 'Standard', 'Detailed', 'Full'];

// All the personalization questions, in four tiers. Every one is optional and skipping counts as No (A117).
// None of them is a screening test (A72).
export const FullQuizPanel: React.FC = () => {
  const { quizAnswers, recordQuizAnswer } = useApp();
  const [tier, setTier] = useState<Tier>('Basic');
  const questions = QUIZ_QUESTIONS.filter((q) => q.tier === tier);

  return (
    <section aria-labelledby="full-quiz-heading" className="space-y-3">
      <div>
        <h3 id="full-quiz-heading" className="font-bold">
          All {QUIZ_QUESTIONS.length} questions
        </h3>
        <p className="text-sm text-muted">
          Every question is optional, and skipping counts as No. These only change how the app looks and plans. They are
          not a test of any kind. You can change any setting yourself later.
        </p>
      </div>
      <div role="group" aria-label="Question groups" className="flex flex-wrap gap-2">
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tier === t}
            onClick={() => setTier(t)}
            className={`min-h-[44px] px-3 py-1 rounded border text-sm font-medium ${
              tier === t ? 'bg-accent text-on-accent border-accent' : 'bg-bg text-text border-border'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <ul className="space-y-3">
        {questions.map((q) => {
          const current = quizAnswers.find((a) => a.questionId === q.id)?.answer ?? 'skipped';
          return (
            <li key={q.id} className="p-3 rounded border border-border bg-bg space-y-2">
              <p id={`quiz-q-${q.id}`} className="text-sm font-medium">
                {q.question}
              </p>
              <div role="group" aria-labelledby={`quiz-q-${q.id}`} className="flex flex-wrap gap-2">
                {(['yes', 'no', 'skipped'] as const).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    aria-pressed={current === choice}
                    onClick={() => void recordQuizAnswer(q.id, choice)}
                    className={`min-h-[44px] px-4 py-1 rounded border text-sm font-medium ${
                      current === choice ? 'bg-accent text-on-accent border-accent' : 'bg-surface text-text border-border'
                    }`}
                  >
                    {choice === 'yes' ? 'Yes' : choice === 'no' ? 'No' : 'Skip (counts as No)'}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
