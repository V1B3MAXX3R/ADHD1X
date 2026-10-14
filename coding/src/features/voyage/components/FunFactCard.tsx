import React from 'react';
import { FunFact } from '../funFacts';

export const FunFactCard: React.FC<{ fact: FunFact; onAnother: () => void }> = ({ fact, onAnother }) => (
  <div className="p-4 rounded border border-border bg-bg space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-accent">
        Fun fact • {fact.category}
      </span>
      <button
        type="button"
        onClick={onAnother}
        className="min-h-[44px] px-3 text-sm underline text-text"
      >
        Another fact
      </button>
    </div>
    <p className="leading-relaxed">&ldquo;{fact.fact}&rdquo;</p>
    <p className="text-xs text-muted">Source: {fact.source}</p>
  </div>
);
