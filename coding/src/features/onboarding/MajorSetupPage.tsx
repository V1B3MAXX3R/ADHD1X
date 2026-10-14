import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { useApp } from '../../app/AppContext';

export const MajorSetupPage: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const [major, setMajor] = useState(settings.major ?? '');
  const navigate = useNavigate();

  return (
    <AppShell title="Your major (optional)">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await updateSettings({ major: major.trim() || undefined }, false);
          navigate('/setup/courses');
        }}
        className="space-y-4 bg-surface p-6 rounded border border-border"
      >
        <div>
          <label htmlFor="major-input" className="block font-medium mb-1">
            What is your major or field of study?
          </label>
          <input
            id="major-input"
            type="text"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
          />
          <p className="text-xs text-muted mt-1">
            Used only to weight your major courses in the day plan and tailor starter steps.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={() => navigate('/setup/courses')}
            className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
          >
            Skip for now
          </button>
        </div>
      </form>
    </AppShell>
  );
};
