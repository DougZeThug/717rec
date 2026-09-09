import { useEffect, useState } from 'react';

/**
 * Pulses the score pill for 1.5s whenever either score arrives or changes.
 *
 * Lives here rather than in the card so the card holds no timer state of its
 * own; the card only reads the flag.
 */
export const useScoreAnimation = (team1Score?: number, team2Score?: number): boolean => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (team1Score === undefined && team2Score === undefined) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 1500);
    return () => clearTimeout(timer);
  }, [team1Score, team2Score]);

  return isAnimating;
};
