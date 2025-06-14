
import { TeamTimeslot } from '@/types/timeslots';
import { format } from 'date-fns';
import { TeamPair, TimeBlockTeamsMap } from '@/types/autoSchedule';
import { Team, Match } from '@/types';

/**
 * Create a mock date string in ISO format
 */
export function createMockDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Create a mock team timeslot
 */
export function createMockTimeslot(overrides: Partial<TeamTimeslot> = {}): TeamTimeslot {
  return {
    id: 'timeslot-1',
    match_date: '2023-06-15',
    timeslot: '6:30 PM',
    team_id: 'team-1',
    created_at: '2023-06-10T10:00:00Z',
    is_back_to_back: false,
    pair_slot: null,
    match_sequence: null,
    teams: {
      id: 'team-1',
      name: 'Mock Team',
      logo_url: '/mock-logo.png',
      image_url: null,
      divisionName: 'Division A',
    },
    ...overrides
  };
}

/**
 * Create a block of mock team timeslots
 */
export function createMockTimeslotBlock(
  timeslot: string,
  count: number,
  baseDate: Date = new Date()
): TeamTimeslot[] {
  const dateStr = format(baseDate, 'yyyy-MM-dd');
  return Array(count).fill(null).map((_, i) => createMockTimeslot({
    id: `timeslot-${i + 1}`,
    match_date: dateStr,
    timeslot,
    team_id: `team-${i + 1}`,
    teams: {
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      logo_url: `/logo-${i + 1}.png`,
      image_url: null,
      divisionName: 'Division A',
    }
  }));
}

/**
 * Create a mock team
 */
export function createMockTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Mock Team',
    logoUrl: '/logo.png',
    wins: 5,
    losses: 2,
    game_wins: 15,
    game_losses: 6,
    sos: 0.6,
    power_score: 75,
    ...overrides
  } as Team;
}

/**
 * Create a mock time block teams map
 */
export function createMockTimeBlockTeams(
  counts: Record<string, number> = { '6:30': 2, '7:30': 2, '8:30': 2 }
): TimeBlockTeamsMap {
  const result: TimeBlockTeamsMap = {};
  
  Object.entries(counts).forEach(([block, count]) => {
    result[block] = Array(count).fill(null).map((_, i) => createMockTeam({
      id: `team-${block}-${i + 1}`,
      name: `Team ${block}-${i + 1}`
    }));
  });
  
  return result;
}

/**
 * Create a mock team pairing
 */
export function createMockTeamPairing(overrides: Partial<TeamPair> = {}): TeamPair {
  return {
    team1: createMockTeam({ id: 'team-1', name: 'Team 1' }),
    team2: createMockTeam({ id: 'team-2', name: 'Team 2' }),
    compatibilityScore: 8.5,
    hasPlayedBefore: false,
    ...overrides
  };
}

/**
 * Create a mock match
 */
export function createMockMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    team1_id: 'team-1',
    team2_id: 'team-2',
    date: new Date().toISOString(),
    location: 'Mock Location',
    ...overrides
  } as Match;
}
