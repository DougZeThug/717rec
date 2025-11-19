/**
 * Diverse color palette for team differentiation
 * Each color has light and dark mode variants for optimal contrast
 */
const TEAM_COLOR_PALETTE = {
  light: [
    '#dc2626', // red-600
    '#2563eb', // blue-600
    '#059669', // emerald-600
    '#d97706', // amber-600
    '#9333ea', // purple-600
    '#db2777', // pink-600
    '#0891b2', // cyan-600
    '#ea580c', // orange-600
    '#65a30d', // lime-600
    '#7c3aed', // violet-600
    '#0d9488', // teal-600
    '#c026d3', // fuchsia-600
  ],
  dark: [
    '#f87171', // red-400
    '#60a5fa', // blue-400
    '#34d399', // emerald-400
    '#fbbf24', // amber-400
    '#c084fc', // purple-400
    '#f472b6', // pink-400
    '#22d3ee', // cyan-400
    '#fb923c', // orange-400
    '#a3e635', // lime-400
    '#a78bfa', // violet-400
    '#2dd4bf', // teal-400
    '#e879f9', // fuchsia-400
  ]
};

/**
 * Simple hash function to consistently map team IDs to colors
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
 * Get a unique hex color for a team based on their ID
 * Uses deterministic hashing to ensure same team always gets same color
 */
export const getTeamColor = (teamId: string, isDark: boolean = false): string => {
  const palette = isDark ? TEAM_COLOR_PALETTE.dark : TEAM_COLOR_PALETTE.light;
  const index = hashTeamId(teamId) % palette.length;
  return palette[index];
};

/**
 * Get colors for multiple teams
 */
export const getTeamColors = (teamIds: string[], isDark: boolean = false): Map<string, string> => {
  const colorMap = new Map<string, string>();
  
  teamIds.forEach(teamId => {
    colorMap.set(teamId, getTeamColor(teamId, isDark));
  });
  
  return colorMap;
};
