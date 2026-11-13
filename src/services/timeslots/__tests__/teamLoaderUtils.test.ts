import { format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

import { getAllBackToBackTeams, getTeamsByBackToBackPair } from '../teamLoaderUtils';

// Mock Supabase client (per-test implementations override in beforeEach)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock BACK_TO_BACK_PAIRS
vi.mock('@/utils/autoSchedule/constants', () => ({
  BACK_TO_BACK_PAIRS: {
    Early: { primary: '6:30 PM', secondary: '7:00 PM' },
    Mid: { primary: '7:30 PM', secondary: '8:00 PM' },
    Late: { primary: '8:30 PM', secondary: '9:00 PM' },
  },
  getPairConfig: vi.fn((pairName: string) => {
    const pairs: Record<string, { primary: string; secondary: string }> = {
      Early: { primary: '6:30 PM', secondary: '7:00 PM' },
      Mid: { primary: '7:30 PM', secondary: '8:00 PM' },
      Late: { primary: '8:30 PM', secondary: '9:00 PM' },
    };
    return pairs[pairName] || null;
  }),
  getBackToBackPairName: vi.fn(),
}));

// Keep the other logger functions real. Only the three this file calls are replaced, so a test
// can see what was logged.
vi.mock('@/utils/logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/logger')>()),
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

/** The team data the loader reads from a team_timeslots row. */
const teamData = (teamId: string) => ({
  id: teamId,
  name: `Team ${teamId}`,
  logo_url: null,
  image_url: null,
  division_id: 'division1',
  divisions: { name: 'Division A', display_division: 'Division A' },
  wins: 5,
  losses: 2,
  game_wins: 15,
  game_losses: 6,
});

/** One team_timeslots row: a team booked in one slot of a back-to-back pair. */
const slotRow = (teamId: string, timeslot: string, matchSequence: number, pairSlot: string) => ({
  id: `${teamId}-${timeslot}`,
  team_id: teamId,
  timeslot,
  match_date: '2023-06-15',
  is_back_to_back: true,
  pair_slot: pairSlot,
  match_sequence: matchSequence,
  teams: teamData(teamId),
});

/** Make the team_timeslots query answer with the rows `rowsFor` picks for the slots it asked for. */
const mockTimeslotQuery = (rowsFor: (slots: string[]) => object[]) => {
  const mockIn = vi.fn((_column: string, slots: string[]) => ({
    eq: vi.fn().mockResolvedValue({ data: rowsFor(slots), error: null }),
  }));
  const mockEq = vi.fn().mockReturnValue({ in: mockIn });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  vi.mocked(supabase.from).mockImplementation(vi.fn().mockReturnValue({ select: mockSelect }));
};

/** Team 1 holds both slots of the Early pair, as the loader expects. */
const team1EarlyRows = [
  slotRow('team-1', '6:30 PM', 1, '7:00 PM'),
  slotRow('team-1', '7:00 PM', 2, '6:30 PM'),
];

describe('teamLoaderUtils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getTeamsByBackToBackPair', () => {
    it('should fetch teams for a given back-to-back pair', async () => {
      // Mock successful Supabase response with valid back-to-back data
      const mockTeamData = [
        {
          id: 'slot1',
          team_id: 'team1',
          timeslot: '6:30 PM',
          match_date: '2023-06-15',
          is_back_to_back: true,
          pair_slot: '7:00 PM',
          match_sequence: 1,
          teams: {
            id: 'team1',
            name: 'Tigers',
            logo_url: '/logos/tigers.png',
            image_url: null,
            division_id: 'division1',
            divisions: { name: 'Division A', display_division: 'Division A' },
            wins: 5,
            losses: 2,
            game_wins: 15,
            game_losses: 6,
          },
        },
        {
          id: 'slot2',
          team_id: 'team1',
          timeslot: '7:00 PM',
          match_date: '2023-06-15',
          is_back_to_back: true,
          pair_slot: '6:30 PM',
          match_sequence: 2,
          teams: {
            id: 'team1',
            name: 'Tigers',
            logo_url: '/logos/tigers.png',
            image_url: null,
            division_id: 'division1',
            divisions: { name: 'Division A', display_division: 'Division A' },
            wins: 5,
            losses: 2,
            game_wins: 15,
            game_losses: 6,
          },
        },
      ];

      const mockResponse = { data: mockTeamData, error: null };
      const mockEq3 = vi.fn().mockResolvedValue(mockResponse);
      const mockIn = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq2 = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const testDate = new Date('2023-06-15');
      const teams = await getTeamsByBackToBackPair(testDate, 'Early');

      // Should call Supabase with correct parameters
      expect(supabase.from).toHaveBeenCalledWith('team_timeslots');
      expect(mockSelect).toHaveBeenCalled();

      const formattedDate = format(testDate, 'yyyy-MM-dd');
      expect(mockEq2).toHaveBeenCalledWith('match_date', formattedDate);

      // Should return formatted team data (1 team with both back-to-back slots)
      expect(teams).toHaveLength(1);
      expect(teams[0].name).toBe('Tigers');
    });

    it('should handle empty results', async () => {
      // Mock empty Supabase response
      const mockResponse = { data: [], error: null };
      const mockEq3 = vi.fn().mockResolvedValue(mockResponse);
      const mockIn = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq2 = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const testDate = new Date('2023-06-15');
      const teams = await getTeamsByBackToBackPair(testDate, 'Early');

      // Should return empty array
      expect(teams).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Supabase error response
      const mockResponse = { data: null, error: new Error('Database error') };
      const mockEq3 = vi.fn().mockResolvedValue(mockResponse);
      const mockIn = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq2 = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const testDate = new Date('2023-06-15');

      // Should return empty array on error (graceful degradation)
      const teams = await getTeamsByBackToBackPair(testDate, 'Early');
      expect(teams).toHaveLength(0);
    });

    it("returns no teams and does not query when the date is invalid (today's behaviour)", async () => {
      const teams = await getTeamsByBackToBackPair(new Date('not a date'), 'Early');

      expect(teams).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("returns no teams and does not query when the pair name is unknown (today's behaviour)", async () => {
      const teams = await getTeamsByBackToBackPair(new Date('2023-06-15'), 'NoSuchPair');

      expect(teams).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("keeps the valid team and logs a row in a slot outside the pair (today's behaviour)", async () => {
      // The query filters by slot, so a 9:30 PM row should never come back. This is the guard for it.
      const strayRow = slotRow('team-stray', '9:30 PM', 1, '10:00 PM');
      mockTimeslotQuery(() => [...team1EarlyRows, strayRow]);

      const teams = await getTeamsByBackToBackPair(new Date('2023-06-15'), 'Early');

      expect(teams.map((team) => team.id)).toEqual(['team-1']);
      expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('unexpected timeslots'), [
        'team-stray -> 9:30 PM',
      ]);
    });

    it("leaves out a team that has only one of its two slots (today's behaviour)", async () => {
      mockTimeslotQuery(() => [...team1EarlyRows, slotRow('team-2', '6:30 PM', 1, '7:00 PM')]);

      const teams = await getTeamsByBackToBackPair(new Date('2023-06-15'), 'Early');

      expect(teams.map((team) => team.id)).toEqual(['team-1']);
    });

    it.each([
      ['its first slot points at a slot of another pair', '7:30 PM', '6:30 PM'],
      ['its second slot points at a slot of another pair', '7:00 PM', '8:00 PM'],
    ])(
      "leaves out a team whose two slots do not point at each other: %s (today's behaviour)",
      async (_case, firstSlotPartner, secondSlotPartner) => {
        mockTimeslotQuery(() => [
          ...team1EarlyRows,
          slotRow('team-2', '6:30 PM', 1, firstSlotPartner),
          slotRow('team-2', '7:00 PM', 2, secondSlotPartner),
        ]);

        const teams = await getTeamsByBackToBackPair(new Date('2023-06-15'), 'Early');

        expect(teams.map((team) => team.id)).toEqual(['team-1']);
      }
    );

    it("leaves out a team whose data is gone on the second read (contrived: a row whose teams getter answers once, then null) (today's behaviour)", async () => {
      // The first read passes the "row has a team" check. The second read, when the team is
      // used, finds nothing. Real rows cannot do this: the first check already drops them.
      let teamReads = 0;
      const vanishingTeamRow = {
        ...slotRow('team-2', '6:30 PM', 1, '7:00 PM'),
        get teams() {
          teamReads += 1;
          return teamReads === 1 ? teamData('team-2') : null;
        },
      };
      mockTimeslotQuery(() => [
        ...team1EarlyRows,
        vanishingTeamRow,
        slotRow('team-2', '7:00 PM', 2, '6:30 PM'),
      ]);

      const teams = await getTeamsByBackToBackPair(new Date('2023-06-15'), 'Early');

      expect(teams.map((team) => team.id)).toEqual(['team-1']);
    });

    it("returns no teams and logs when reading a row throws (contrived: a row whose teams getter throws) (today's behaviour)", async () => {
      const readFailure = new Error('row could not be read');
      const unreadableRow = {
        ...slotRow('team-2', '6:30 PM', 1, '7:00 PM'),
        get teams(): never {
          throw readFailure;
        },
      };
      mockTimeslotQuery(() => [...team1EarlyRows, unreadableRow]);

      const teams = await getTeamsByBackToBackPair(new Date('2023-06-15'), 'Early');

      // One unreadable row drops the whole load, valid team 1 included.
      expect(teams).toEqual([]);
      expect(errorLog).toHaveBeenCalledWith(
        'Unexpected error fetching teams for Early pair:',
        readFailure
      );
    });
  });

  describe('getAllBackToBackTeams', () => {
    it("loads every pair and returns the teams keyed by pair name (today's behaviour)", async () => {
      const team3MidRows = [
        slotRow('team-3', '7:30 PM', 1, '8:00 PM'),
        slotRow('team-3', '8:00 PM', 2, '7:30 PM'),
      ];
      const allRows = [...team1EarlyRows, ...team3MidRows];
      // Like the database: each pair's query gets only the rows in its two slots.
      mockTimeslotQuery((slots) => allRows.filter((row) => slots.includes(row.timeslot)));

      const teamsByPair = await getAllBackToBackTeams(new Date('2023-06-15'));

      expect(Object.keys(teamsByPair)).toEqual(['Early', 'Mid', 'Late']);
      expect(teamsByPair.Early?.map((team) => team.id)).toEqual(['team-1']);
      expect(teamsByPair.Mid?.map((team) => team.id)).toEqual(['team-3']);
      expect(teamsByPair.Late).toEqual([]);
      // One query per pair.
      expect(supabase.from).toHaveBeenCalledTimes(3);
    });
  });
});
