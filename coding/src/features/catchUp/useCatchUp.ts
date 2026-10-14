import { useApp } from '../../app/AppContext';
import { Settings } from '../../shared/data/schemas';

export type CatchUpSettings = Settings['catchUp'];

// Reads the Catch Up settings and saves changes to them.
export function useCatchUp() {
  const { settings, updateSettings } = useApp();
  const catchUp = settings.catchUp;
  const isSpace = settings.interfaceStyle === 'space';
  const save = (patch: Partial<CatchUpSettings>) => updateSettings({ catchUp: { ...catchUp, ...patch } });
  // A56: "Hyperdrive" in Space style, "Catch-up mode" in Regular style.
  const modeName = isSpace ? 'Hyperdrive' : 'Catch-up mode';
  return { catchUp, isSpace, modeName, save };
}
