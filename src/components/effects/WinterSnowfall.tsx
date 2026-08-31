import Snowfall from 'react-snowfall';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';

/**
 * Snow effect component that only renders when winter theme is active on homepage.
 *
 * The snow is drawn on a canvas, so no stylesheet can stop it. It is therefore
 * switched off here when the user has asked for reduced motion.
 */
export const WinterSnowfall = () => {
  const { shouldApplyWinter } = useSeasonalTheme();
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!shouldApplyWinter || prefersReducedMotion) return null;

  return (
    <Snowfall
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 5,
        pointerEvents: 'none',
      }}
      snowflakeCount={200}
      radius={[1, 4]}
      speed={[0.5, 2.5]}
      wind={[-1, 2]}
      color="rgba(255,255,255,0.9)"
    />
  );
};
