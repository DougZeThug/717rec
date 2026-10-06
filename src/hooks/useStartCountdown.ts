import { useEffect, useState } from 'react';

export interface StartCountdown {
  text: string;
  /** 0-100. Fills up over the 12 hours before the start. */
  percent: number;
}

const COUNTDOWN_WINDOW_MS = 12 * 60 * 60 * 1000;
const TICK_MS = 60000;

/** Countdown text and progress for an event that starts at `startTime`. */
export const getStartCountdown = (startTime: Date, now: Date): StartCountdown => {
  const startDiff = startTime.getTime() - now.getTime();

  if (startDiff <= 0) return { text: 'Event started!', percent: 100 };

  const hours = Math.floor(startDiff / (1000 * 60 * 60));
  const minutes = Math.floor((startDiff % (1000 * 60 * 60)) / (1000 * 60));
  const percent = Math.max(0, Math.min(100, 100 - (startDiff / COUNTDOWN_WINDOW_MS) * 100));

  if (hours > 0) return { text: `${hours}h ${minutes}m until start`, percent };
  if (minutes > 0) return { text: `${minutes}m until start`, percent };
  return { text: 'Starting now!', percent: 100 };
};

/** Keeps a start countdown up to date once a minute. Idle when there is no start time. */
export const useStartCountdown = (startTimeStr: string | null | undefined): StartCountdown => {
  const [countdown, setCountdown] = useState<StartCountdown>({ text: '', percent: 0 });

  useEffect(() => {
    if (!startTimeStr) return;

    const startTime = new Date(startTimeStr);
    const updateCountdown = () => setCountdown(getStartCountdown(startTime, new Date()));

    updateCountdown();
    const intervalId = setInterval(updateCountdown, TICK_MS);
    return () => clearInterval(intervalId);
  }, [startTimeStr]);

  return countdown;
};
