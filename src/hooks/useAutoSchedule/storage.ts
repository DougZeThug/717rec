import {
  AutoScheduleMatch,
  MatchQualityMetrics,
  TeamPairingMap,
  TimeBlockTeamsMap,
} from '@/types/autoSchedule';
import { scheduleLog, warnLog } from '@/utils/logger';

const STORAGE_KEY = 'autoScheduleState';

/**
 * State that gets persisted to sessionStorage
 */
export interface PersistedAutoScheduleState {
  // Date (stored as ISO string)
  selectedDate: string | null;

  // Tab and mode state
  activeTab: string;
  isEditMode: boolean;

  // Algorithm settings
  avoidRematches: boolean;
  prioritizeQuality: boolean;
  dualMatchMode: boolean;

  // Generated data
  generatedMatches: AutoScheduleMatch[];
  editableMatches: AutoScheduleMatch[];
  matchQualityMetrics: MatchQualityMetrics | null;

  // Pairing data
  generatedPairings: TeamPairingMap;
  unmatchedTeamIds: string[];

  // Team data
  timeBlockTeams: TimeBlockTeamsMap;
  originalTimeBlockTeams: TimeBlockTeamsMap;
  teamBlockMap: Record<string, string[]>;
}

/**
 * Default empty state
 */
export const getDefaultPersistedState = (): PersistedAutoScheduleState => ({
  selectedDate: new Date().toISOString(),
  activeTab: 'teams',
  isEditMode: false,
  avoidRematches: true,
  prioritizeQuality: false,
  dualMatchMode: true,
  generatedMatches: [],
  editableMatches: [],
  matchQualityMetrics: null,
  generatedPairings: {},
  unmatchedTeamIds: [],
  timeBlockTeams: {},
  originalTimeBlockTeams: {},
  teamBlockMap: {},
});

/**
 * Load persisted state from sessionStorage
 */
export function loadAutoScheduleState(): PersistedAutoScheduleState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as PersistedAutoScheduleState;
    scheduleLog('Loaded auto-schedule state from sessionStorage');
    return parsed;
  } catch (error) {
    warnLog('Failed to load auto-schedule state from sessionStorage:', error);
    return null;
  }
}

/**
 * Save state to sessionStorage
 */
export function saveAutoScheduleState(state: Partial<PersistedAutoScheduleState>): void {
  try {
    // Merge with existing state to allow partial updates
    const existing = loadAutoScheduleState() || getDefaultPersistedState();
    const merged = { ...existing, ...state };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    warnLog('Failed to save auto-schedule state to sessionStorage:', error);
  }
}

/**
 * Clear persisted state (call after successful save)
 */
export function clearAutoScheduleState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    scheduleLog('Cleared auto-schedule state from sessionStorage');
  } catch (error) {
    warnLog('Failed to clear auto-schedule state:', error);
  }
}

/**
 * Convert Date objects in matches to ISO strings for storage
 * (Date objects become strings when JSON.stringify'd anyway, this makes it explicit)
 */
export function serializeMatches(matches: AutoScheduleMatch[]): AutoScheduleMatch[] {
  return matches.map((match) => ({
    ...match,
    date: match.date instanceof Date ? match.date : new Date(match.date),
  }));
}

/**
 * Convert ISO string dates back to Date objects when loading
 */
export function deserializeMatches(matches: AutoScheduleMatch[]): AutoScheduleMatch[] {
  return matches.map((match) => ({
    ...match,
    date: new Date(match.date),
  }));
}
