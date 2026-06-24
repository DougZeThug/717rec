import React from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Hook for managing save status with auto-reset
 */
export function useSaveStatus(resetDelay = 2500) {
  const [status, setStatus] = React.useState<SaveStatus>('idle');

  const setSaving = React.useCallback(() => setStatus('saving'), []);
  const setSaved = React.useCallback(() => {
    setStatus('saved');
    setTimeout(() => setStatus('idle'), resetDelay);
  }, [resetDelay]);
  const setError = React.useCallback(() => {
    setStatus('error');
    setTimeout(() => setStatus('idle'), resetDelay);
  }, [resetDelay]);
  const reset = React.useCallback(() => setStatus('idle'), []);

  return { status, setSaving, setSaved, setError, reset };
}
