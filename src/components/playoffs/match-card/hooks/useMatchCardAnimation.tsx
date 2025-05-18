
import { useMemo } from "react";
import { matchUpdateAnimation } from "../../animation/BracketAnimationUtils";

export const useMatchCardAnimation = (isUpdated: boolean) => {
  // Animation style for updated matches
  const animationStyle = useMemo(() => {
    return isUpdated ? { animation: matchUpdateAnimation } : {};
  }, [isUpdated]);

  return { animationStyle };
};
