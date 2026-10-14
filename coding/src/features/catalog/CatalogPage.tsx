import React, { useState } from 'react';
import { AppShell } from '../../shared/components/AppShell';
import { useApp } from '../../app/AppContext';

// Developer-only page (registered only when running `npm run dev`). Shows the four approved
// palettes and the basic controls so contrast and focus can be checked by eye and by axe.
export const CatalogPage: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const [sampleText, setSampleText] = useState('Read Chapter 4');
  const [sampleDialog, setSampleDialog] = useState(false);

  return (
    <AppShell title="Component Catalog (Dev)">
      <div className="space-y-6">
        <section className="p-4 rounded border border-border bg-surface space-y-3">
          <h2 className="font-bold text-lg">1. Four approved palettes (T73)</h2>
          <p className="text-sm text-muted">
            Current: theme={settings.theme}, style={settings.interfaceStyle}, dim={String(settings.dim)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void updateSettings({ theme: 'normal', interfaceStyle: 'space', dim: false })}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Space Palette
            </button>
            <button
              type="button"
              onClick={() => void updateSettings({ theme: 'low', interfaceStyle: 'regular', dim: false })}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text font-medium"
            >
              Low (Light) Palette
            </button>
            <button
              type="button"
              onClick={() => void updateSettings({ theme: 'low', interfaceStyle: 'regular', dim: true })}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text font-medium"
            >
              Low (Dim) Palette
            </button>
            <button
              type="button"
              onClick={() => void updateSettings({ theme: 'normal', interfaceStyle: 'regular', dim: false })}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text font-medium"
            >
              Standard (Light) Palette
            </button>
          </div>
        </section>

        <section className="p-4 rounded border border-border bg-surface space-y-3">
          <h2 className="font-bold text-lg">2. Buttons (44 by 44 px minimum target)</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              className="min-h-[44px] min-w-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Primary Button
            </button>
            <button
              type="button"
              className="min-h-[44px] min-w-[44px] px-4 py-2 rounded border border-border bg-bg text-text font-medium"
            >
              Secondary Button
            </button>
            <button
              type="button"
              disabled
              aria-describedby="disabled-reason-demo"
              className="min-h-[44px] min-w-[44px] px-4 py-2 rounded bg-accent text-on-accent opacity-50"
            >
              Disabled Button
            </button>
          </div>
          <p id="disabled-reason-demo" className="text-xs text-muted">
            Disabled reason: always say in plain words why a button is disabled.
          </p>
        </section>

        <section className="p-4 rounded border border-border bg-surface space-y-3">
          <h2 className="font-bold text-lg">3. Form controls (WCAG 3.3.1, 3.3.2)</h2>
          <div>
            <label htmlFor="cat-input" className="block font-medium mb-1">
              Visible label (never placeholder-only)
            </label>
            <input
              id="cat-input"
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              aria-describedby="cat-input-note"
              className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
            />
            <p id="cat-input-note" className="text-sm text-due-soon mt-1">
              Example notice: due within 24 hours (* due tomorrow). Uses words, never color alone.
            </p>
          </div>
        </section>

        <section className="p-4 rounded border border-border bg-surface space-y-3">
          <h2 className="font-bold text-lg">4. Status banner and dialog</h2>
          <div role="status" className="p-3 rounded border border-border bg-bg text-sm">
            Status banner (role=&quot;status&quot;, never takes focus).
          </div>
          <button
            type="button"
            onClick={() => setSampleDialog(true)}
            className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
          >
            Open Sample Dialog
          </button>
          {sampleDialog && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cat-dlg-title"
              onKeyDown={(e) => e.key === 'Escape' && setSampleDialog(false)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            >
              <div className="max-w-md w-full rounded bg-surface p-6 text-text border border-border space-y-4">
                <h3 id="cat-dlg-title" className="text-lg font-bold">
                  Sample Dialog
                </h3>
                <p className="text-sm">Press Escape or choose Close.</p>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setSampleDialog(false)}
                  className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};
