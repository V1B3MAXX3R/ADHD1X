import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { AiFailureReason, callAiPreset, getCalmErrorMessage } from '../../shared/ai/client';
import type { PresetName } from '../../../server/presets';

// Shared plumbing for every Gemini button: shows the Gemini notice the first time (A15), tracks
// loading, and turns any failure into one calm sentence. Nothing is saved from here; each panel
// shows the result for review first (A4).
export function useAiCall() {
  const { requestGeminiWithNotice } = useApp();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  function run<T>(
    preset: PresetName,
    payload: Record<string, unknown>,
    onOk: (data: T) => void,
    onFail?: (reason: AiFailureReason) => void,
  ) {
    requestGeminiWithNotice(async () => {
      setLoading(true);
      setNotice('');
      const res = await callAiPreset<T>(preset, payload);
      setLoading(false);
      if (res.ok) {
        onOk(res.data);
      } else {
        setNotice(getCalmErrorMessage(res.reason));
        onFail?.(res.reason);
      }
    });
  }

  return { loading, notice, setNotice, run };
}
