import useSound from 'use-sound';

import roundSavedSound from '@/assets/sounds/round-saved.wav';
import { usePersistedState } from '@/hooks/usePersistedState';

const STORAGE_KEY = '717rec:live-scoring-sound';

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

/**
 * The "round saved" sound for live scoring, plus the scorer's on/off choice.
 *
 * Off by default: scoring often happens in a loud room, or a quiet one, and
 * nobody asked for noise. The choice sticks to this device.
 */
export function useRoundSavedSound() {
  const [soundEnabled, setStoredSoundEnabled] = usePersistedState<boolean>(
    STORAGE_KEY,
    false,
    isBoolean
  );
  const [play] = useSound(roundSavedSound, { volume: 0.6, soundEnabled, interrupt: true });

  /**
   * Turning the sound on plays it once, so the scorer hears what they chose.
   * That tap is also the user gesture phones need before they allow audio.
   */
  const setSoundEnabled = (enabled: boolean) => {
    setStoredSoundEnabled(enabled);
    if (enabled) play({ forceSoundEnabled: true });
  };

  return { soundEnabled, setSoundEnabled, playRoundSaved: play };
}
