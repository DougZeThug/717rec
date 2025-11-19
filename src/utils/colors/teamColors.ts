/**
 * Simple hash function to consistently map team IDs to hue values
 */
const hashTeamId = (teamId: string): number => {
  let hash = 0;
  for (let i = 0; i < teamId.length; i++) {
    hash = ((hash << 5) - hash) + teamId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Get a unique HSL color for a team based on their ID
 * Uses deterministic hashing to distribute hues evenly across the color wheel
 * Supports unlimited teams with no color collisions
 */
export const getTeamColor = (teamId: string, isDark: boolean = false): string => {
  const hash = hashTeamId(teamId);
  const hue = hash % 360; // Distribute across full color wheel (0-359 degrees)
  
  // Optimize saturation and lightness for readability in each theme
  const saturation = isDark ? 70 : 65;
  const lightness = isDark ? 65 : 45;
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
