import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { useApp } from '../../app/AppContext';
import { QUIZ_QUESTIONS } from '../../logic/quizRules';

export const DISCLAIMER_TEXT_A21 =
  "Before we start. This short quiz is optional: skip it now and change your answers anytime. Your answers only change how ADHD1X looks and works for you, like layout, reminders, and how tasks get broken down. This isn't a test or a diagnosis, and nothing here is medical or mental health advice. ADHD1X is a planning tool to help you organize things your way. If you need medical or mental health support, please reach out to a qualified professional. The one required step is confirming you're 18 or older.";

export const WelcomePage: React.FC = () => {
  const { settings, updateSettings, recordQuizAnswer } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<'disclaimer' | 'age' | 'quiz' | 'done'>('disclaimer');
  const [ageChecked, setAgeChecked] = useState(settings.ageConfirmed18);
  const [qIndex, setQIndex] = useState(0);

  const basicFive = QUIZ_QUESTIONS.slice(0, 5);
  const currentQ = basicFive[qIndex];

  const handleAnswer = async (ans: 'yes' | 'no' | 'skipped') => {
    await recordQuizAnswer(currentQ.id, ans);
    if (qIndex < basicFive.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      setStep('done');
    }
  };

  if (step === 'disclaimer') {
    return (
      <AppShell title="Before we start">
        <div className="space-y-6 bg-surface p-6 rounded border border-border">
          <p className="text-base leading-relaxed">{DISCLAIMER_TEXT_A21}</p>
          <button
            type="button"
            onClick={() => setStep('age')}
            className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium"
          >
            Continue
          </button>
        </div>
      </AppShell>
    );
  }

  if (step === 'age') {
    return (
      <AppShell title="Confirm your age">
        <div className="space-y-4 bg-surface p-6 rounded border border-border">
          <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={ageChecked}
              onChange={(e) => setAgeChecked(e.target.checked)}
              className="w-6 h-6"
              aria-describedby="age-required-reason"
            />
            <span className="font-medium">I&apos;m 18 or older (required)</span>
          </label>
          {!ageChecked && (
            <p id="age-required-reason" className="text-sm text-muted">
              Please check the box confirming you are 18 or older to enable Continue.
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={!ageChecked}
              onClick={async () => {
                await updateSettings({ ageConfirmed18: true }, false);
                setStep('quiz');
              }}
              className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (step === 'quiz') {
    return (
      <AppShell title={`Question ${qIndex + 1} of 5`}>
        <div className="space-y-6 bg-surface p-6 rounded border border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Personalization quiz (optional)</span>
            <button
              type="button"
              onClick={() => void handleAnswer('skipped')}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
            >
              Skip
            </button>
          </div>

          <p className="text-lg font-medium">{currentQ.question}</p>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => void handleAnswer('yes')}
              className="min-h-[44px] min-w-[120px] px-6 py-3 rounded bg-accent text-on-accent font-medium"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => void handleAnswer('no')}
              className="min-h-[44px] min-w-[120px] px-6 py-3 rounded border border-border bg-bg text-text font-medium"
            >
              No
            </button>
          </div>

          <p className="text-xs text-muted">You can change this anytime in Settings.</p>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => (qIndex > 0 ? setQIndex(qIndex - 1) : setStep('age'))}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
            >
              Back
            </button>
            <button
              type="button"
              onClick={async () => {
                for (let i = qIndex; i < basicFive.length; i++) {
                  await recordQuizAnswer(basicFive[i].id, 'skipped');
                }
                navigate('/setup/major');
              }}
              className="min-h-[44px] px-4 py-2 underline text-muted"
            >
              Skip remaining questions
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="That's enough to set things up">
      <div className="space-y-4 bg-surface p-6 rounded border border-border">
        <p>Your basic preferences are saved. You can adjust them anytime in Settings.</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/setup/major')}
            className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium"
          >
            Set up now with these
          </button>
        </div>
      </div>
    </AppShell>
  );
};
