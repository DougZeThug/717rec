import Snowfall from 'react-snowfall';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';

/**
 * Snow effect component that only renders when winter theme is active on homepage
 */
export const WinterSnowfall = () => {
  const { shouldApplyWinter } = useSeasonalTheme();
  
  if (!shouldApplyWinter) return null;
  
  return (
    <Snowfall
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 5, // Lower z-index so snow stays behind content (cards are z-10+)
        pointerEvents: 'none',
      }}
      snowflakeCount={60}
      radius={[0.5, 2.5]}
      speed={[0.5, 1.5]}
      wind={[-0.5, 1]}
      color="rgba(255,255,255,0.85)"
    />
  );
};

export default WinterSnowfall;
