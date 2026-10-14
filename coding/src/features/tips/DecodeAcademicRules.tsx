import React, { useState } from 'react';
import { filterPhrases } from './academicPhrases';

export const DecodeAcademicRules: React.FC = () => {
  const [search, setSearch] = useState('');
  const shown = filterPhrases(search);

  return (
    <section aria-labelledby="decode-heading" className="space-y-3">
      <h2 id="decode-heading" className="text-lg font-bold">
        What syllabus phrases usually mean
      </h2>
      <p className="text-sm text-muted">
        These are common readings, not rules. If you are not sure, ask your professor what they mean.
      </p>
      <label htmlFor="phrase-search" className="block text-sm font-medium">
        Search phrases
      </label>
      <input
        id="phrase-search"
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="For example: synthesize, office hours"
        className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
      />
      {shown.length === 0 ? (
        <p className="text-sm text-muted">No matching phrases.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {shown.map((p) => (
            <li key={p.phrase} className="p-3 rounded border border-border bg-bg space-y-1">
              <p className="font-bold">{p.phrase}</p>
              <p>{p.literalMeaning}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
