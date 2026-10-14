import React from 'react';
import { Link } from 'react-router-dom';
import { LogItem } from '../types';
import { FunFact } from '../../voyage/funFacts';

interface ContentGridProps {
  logs: LogItem[];
  /** Fun facts are shown in Space style only, and only when this is set (A67, A77). */
  funFact: FunFact | null;
  onNextFunFact: () => void;
  onCompleteAssignment?: (assignmentId: string) => void;
}

export const ContentGrid: React.FC<ContentGridProps> = ({ logs, funFact, onNextFunFact, onCompleteAssignment }) => {
  return (
    <section aria-labelledby="logs-heading" className="py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-[#0D0D0D] pb-3">
        <div>
          <h2 id="logs-heading" className="text-xl sm:text-2xl font-black uppercase tracking-wider text-[#0D0D0D]">
            Mission logs
          </h2>
          <p className="text-xs font-mono text-[#5A5856]">Read from this device. Progress only moves forward.</p>
        </div>
        <Link to="/voyage" className="pulp-ink-button-secondary px-4 py-2 text-xs flex items-center">
          Open the full voyage and logbook
        </Link>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {logs.map((log) => (
          <li key={log.id} className="pulp-ink-card p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b-2 border-[#0D0D0D] pb-2 font-mono text-xs">
                <span className="font-bold bg-[#0D0D0D] text-[#E2DED9] px-2 py-0.5">{log.code}</span>
                <span className="text-[#5A5856] font-bold text-right">{log.sector}</span>
              </div>
              <h3 className="font-black text-lg uppercase leading-snug text-[#0D0D0D]">{log.title}</h3>
              <p className="text-xs font-mono leading-relaxed text-[#0D0D0D]">{log.summary}</p>
            </div>

            <div className="pt-3 border-t border-[#5A5856] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <div>
                <span className="text-[#5A5856] block text-[10px]">{log.timestamp}</span>
                <span className="font-bold uppercase">
                  STATUS: {log.status}
                  {log.thrustPoints ? ` (+${log.thrustPoints} PTS)` : ''}
                </span>
              </div>

              {log.assignmentId && log.status !== 'COMPLETED' && onCompleteAssignment ? (
                <div className="flex gap-2">
                  <Link
                    to={`/start/${log.assignmentId}`}
                    className="pulp-ink-button-secondary px-2.5 py-1 text-[11px] flex items-center"
                  >
                    Start
                  </Link>
                  <button
                    type="button"
                    onClick={() => onCompleteAssignment(log.assignmentId!)}
                    className="pulp-ink-button px-2.5 py-1 text-[11px]"
                  >
                    I finished this
                  </button>
                </div>
              ) : (
                <Link to="/today" className="underline font-bold text-xs min-h-[44px] flex items-center">
                  Open Today
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      {funFact && (
        <aside
          aria-label="Fun fact"
          className="pulp-ink-card p-5 pulp-woodcut-hatch flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="space-y-1 max-w-3xl bg-[#E2DED9] p-3 border-2 border-[#0D0D0D]">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5A5856]">
              Fun fact ({funFact.category})
            </div>
            <p className="text-sm font-mono font-bold text-[#0D0D0D]">&ldquo;{funFact.fact}&rdquo;</p>
            <p className="text-[11px] font-mono text-[#5A5856]">Source: {funFact.source}</p>
          </div>
          <button type="button" onClick={onNextFunFact} className="pulp-ink-button px-4 py-2 text-xs shrink-0">
            Another fact
          </button>
        </aside>
      )}
    </section>
  );
};
