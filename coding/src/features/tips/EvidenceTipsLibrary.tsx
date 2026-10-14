import React, { useState } from 'react';
import { EVIDENCE_TIPS_LIBRARY, TIP_CATEGORIES, TipCategory } from './tipsData';

export const EvidenceTipsLibrary: React.FC = () => {
  const [category, setCategory] = useState<TipCategory | 'all'>('all');
  const visible = EVIDENCE_TIPS_LIBRARY.filter((t) => category === 'all' || t.category === category);

  return (
    <section aria-labelledby="tips-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="tips-heading" className="text-lg font-bold">
          Practical study tips
        </h2>
        <div role="group" aria-label="Tip topics" className="flex flex-wrap gap-2">
          {TIP_CATEGORIES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
              className={`min-h-[44px] px-3 py-1 rounded border text-sm font-medium ${
                category === key ? 'bg-accent text-on-accent border-accent' : 'bg-bg text-text border-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-2">
        {visible.map((tip) => (
          <li key={tip.id} className="p-3 rounded border border-border bg-bg space-y-1 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{tip.title}</strong>
              <span className="text-xs px-2 py-0.5 rounded border border-border bg-surface">{tip.badge}</span>
            </div>
            <p>{tip.body}</p>
            <p className="text-xs text-muted">{tip.sourceNote}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};
