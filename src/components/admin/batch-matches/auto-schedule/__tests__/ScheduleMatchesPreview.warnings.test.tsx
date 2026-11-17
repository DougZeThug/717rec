import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { scheduleStandardPairings } from '@/hooks/scheduling/utils/standardPairing';
import { fetchTeamsByIds } from '@/services/matches/MatchTeamLookupService';
import type { Team } from '@/types';
import type { TeamPairingMap } from '@/types/autoSchedule';
import { LOWEST_NEIGHBOURING_DIVISION_SCORE } from '@/utils/autoSchedule/compatibilityUtils';
import { ratingRow } from '@/utils/test/autoSchedule/qualityHelpers';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import ScheduleMatchesPreview from '../ScheduleMatchesPreview';

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('@/components/ui/team/TeamLogo', () => ({ TeamLogo: () => null }));

// The real generator makes the night for the realistic tests. Only the network and the logger
// are faked.
vi.mock('@/services/matches/SchedulingHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn(),
  haveTeamsPlayedBefore: vi.fn(),
}));

vi.mock('@/services/matches/MatchTeamLookupService', () => ({
  fetchTeamsByIds: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

const WARNINGS = /^\d+ Warnings$/;
const night = new Date(2026, 10, 19);

const makeTeam = (id: string, name: string): Team =>
  ({ id, name, wins: 1, losses: 0 }) as unknown as Team;

/** One block with one pair, so the red count is easy to read. */
const onePair = (compatibilityScore: number, hasPlayedBefore = false): TeamPairingMap => ({
  Early: [
    {
      team1: makeTeam('t1', 'Alpha'),
      team2: makeTeam('t2', 'Bravo'),
      compatibilityScore,
      hasPlayedBefore,
    },
  ],
});

const renderPreview = (pairings: TeamPairingMap) =>
  render(<ScheduleMatchesPreview pairings={pairings} date={night} isGenerating={false} />);

describe('the red Warnings badge on the batch preview', () => {
  it('names the lowest neighbouring-division score 4.5, which is 5 minus the largest skill cut', () => {
    expect(LOWEST_NEIGHBOURING_DIVISION_SCORE).toBe(4.5);
  });

  it.each([
    ['5, the neighbouring-division score with the switch OFF', 5],
    ['4.99609375, a neighbouring pair that is almost level', 4.99609375],
    ['4.5, the lowest a neighbouring pair can get', 4.5],
    ['10, a same-division pair', 10],
    ['9.5, the lowest a same-division pair can get with the switch ON', 9.5],
  ])('does not count a pair that scores %s', (_name, score) => {
    renderPreview(onePair(score));

    expect(screen.queryByText(WARNINGS)).not.toBeInTheDocument();
  });

  it.each([
    ['4.49, a hair under the lowest neighbouring score', 4.49, false],
    ['0, a forbidden pair', 0, false],
    ['10 when the teams already met', 10, true],
    ['5 when the teams already met', 5, true],
    ['4.8 when the teams already met', 4.8, true],
  ])('counts a pair that scores %s', (_name, score, hasPlayedBefore) => {
    renderPreview(onePair(score, hasPlayedBefore));

    expect(screen.getByText('1 Warnings')).toBeInTheDocument();
  });

  it('counts a pair once when it is both a rematch and forbidden', () => {
    renderPreview(onePair(0, true));

    expect(screen.getByText('1 Warnings')).toBeInTheDocument();
  });

  it('adds up the pairs of every block and counts only the ones that need a look', () => {
    const pair = (id: string, score: number, hasPlayedBefore = false) => ({
      team1: makeTeam(`${id}a`, `${id} one`),
      team2: makeTeam(`${id}b`, `${id} two`),
      compatibilityScore: score,
      hasPlayedBefore,
    });

    renderPreview({
      Early: [pair('e1', 9.99609375), pair('e2', 4.98828125), pair('e3', 0)],
      Mid: [pair('m1', 4.5), pair('m2', 10, true), pair('m3', 5)],
      Late: [],
    });

    // Only the forbidden pair (0) and the rematch count. The three neighbouring pairs do not.
    expect(screen.getByText('2 Warnings')).toBeInTheDocument();
  });
});

describe('a night made by the real generator, shown on the batch preview', () => {
  /** Strength goes with the number in the id, so the spread is wide and the same every run. */
  const power = (id: string) => (Number(id.slice(1)) * 17) % 90;
  const rateTeams = () =>
    vi.mocked(fetchTeamsByIds).mockImplementation((ids) =>
      Promise.resolve(
        ids.map((id) => {
          const strength = power(id);
          const wins = Math.round(strength / 10);
          return ratingRow(id, {
            power_score: strength + 5,
            sos: (strength + 5) / 100,
            wins,
            losses: 10 - wins,
            game_wins: wins * 3,
            game_losses: (10 - wins) * 3,
          });
        })
      )
    );

  const teamsOf = (prefix: string, divisions: (string | null)[]): Team[] =>
    divisions.map((divisionName, index) =>
      createMockTeam({
        id: `${prefix}${index + 1}`,
        name: `${prefix}${index + 1}`,
        divisionName,
      })
    );

  // Early: 1 Competitive, 2 Intermediate and 1 Recreational team. Every one of its 4 matches is
  // a neighbouring-division pair. Mid: 6 teams from mixed divisions, where one Competitive team
  // can only be placed by a forbidden pair (this is also true with the switch OFF). Late: 2
  // teams that already met.
  const blocks = () => ({
    Early: teamsOf('E', ['Competitive', 'Intermediate', 'Intermediate', 'Recreational']),
    Mid: teamsOf('M', [
      'Competitive',
      'Intermediate',
      'Recreational',
      'Cuspers',
      'Recreational High',
      null,
    ]),
    Late: teamsOf('L', ['Intermediate', 'Intermediate']),
  });
  const history: [string, string][] = [['L1', 'L2']];

  const scoreTexts = () =>
    screen.getAllByText(/^Score: /).map((element) => element.textContent ?? '');

  it('with the switch ON: neighbouring pairs are amber and exact, and only the forced forbidden pair and the rematch are red', async () => {
    rateTeams();
    const { pairings } = await scheduleStandardPairings(
      blocks(),
      {
        avoidRematches: true,
        weights: { powerScoreWeight: 5, sosWeight: 3, recordWeight: 3.5, gameRecordWeight: 2 },
      },
      history
    );

    const { container } = renderPreview(pairings);

    // 4 neighbouring pairs in Early, 2 in Mid: each scores 4.5 to 5 and reads under 5.
    const nextDoor = scoreTexts().filter((text) => /^Score: 4\.\d{1,2}\/10$/.test(text));
    expect(nextDoor).toHaveLength(6);
    expect(scoreTexts()).not.toContain('Score: 5.0/10');
    // The forbidden pair reads 0.0. The 2 teams that met read 9.5 to 10.
    expect(scoreTexts().filter((text) => text === 'Score: 0.0/10')).toHaveLength(1);
    // The red badge counts the forbidden pair and the rematch, not the 6 neighbouring pairs.
    expect(screen.getByText('2 Warnings')).toBeInTheDocument();
    // Every one of those 6 neighbouring pairs, the forbidden pair and the rematch is amber.
    expect(container.querySelectorAll('.bg-amber-50')).toHaveLength(8);
  });

  it('with the switch OFF: scores are only 10, 5 and 0, and the badge counts the forbidden pairs and the rematch', async () => {
    rateTeams();
    const { pairings } = await scheduleStandardPairings(
      blocks(),
      { avoidRematches: true },
      history
    );

    const { container } = renderPreview(pairings);

    // Early has one forbidden pair here (the OFF list for 1 Competitive, 2 Intermediate and
    // 1 Recreational team), Mid has one, and Late is the rematch.
    expect(scoreTexts().filter((text) => text === 'Score: 5.0/10')).toHaveLength(4);
    expect(scoreTexts().filter((text) => text === 'Score: 0.0/10')).toHaveLength(2);
    expect(scoreTexts().filter((text) => text === 'Score: 10.0/10')).toHaveLength(5);
    expect(screen.getByText('3 Warnings')).toBeInTheDocument();
    // A score of 5 is not amber. The two forbidden pairs and the rematch are.
    expect(container.querySelectorAll('.bg-amber-50')).toHaveLength(3);
  });

  it('with the switch ON and a clean night: no red badge at all, but the neighbouring pairs stay amber', async () => {
    rateTeams();
    const { pairings } = await scheduleStandardPairings(
      { Early: blocks().Early },
      {
        avoidRematches: true,
        weights: { powerScoreWeight: 5, sosWeight: 3, recordWeight: 3.5, gameRecordWeight: 2 },
      },
      []
    );

    const { container } = renderPreview(pairings);

    expect(scoreTexts()).toHaveLength(4);
    expect(scoreTexts().every((text) => /^Score: 4\.\d{1,2}\/10$/.test(text))).toBe(true);
    expect(screen.queryByText(WARNINGS)).not.toBeInTheDocument();
    expect(container.querySelectorAll('.bg-amber-50')).toHaveLength(4);
  });
});

describe('the batch preview before a schedule is made', () => {
  const EMPTY_NOTE = 'No match pairings have been generated yet';

  const renderWithDate = (pairings: TeamPairingMap, date: Date | null) =>
    render(<ScheduleMatchesPreview pairings={pairings} date={date} isGenerating={false} />);

  /** Only the note shows: no heading, no match count, no pair card and no red badge. */
  const expectOnlyTheNote = () => {
    expect(screen.getByText(EMPTY_NOTE)).toBeInTheDocument();
    expect(screen.queryByText('Generated Match Pairings')).not.toBeInTheDocument();
    expect(screen.queryByText(/ Matches$/)).not.toBeInTheDocument();
    expect(screen.queryAllByText(/^Score: /)).toHaveLength(0);
    expect(screen.queryByText(WARNINGS)).not.toBeInTheDocument();
  };

  const emptyNights: [string, TeamPairingMap][] = [
    ['no time blocks at all', {}],
    ['one time block with no pairs', { Early: [] }],
    ['every time block empty', { Early: [], Mid: [], Late: [] }],
  ];

  it.each(emptyNights)('with a date and %s: shows only the note', (_name, pairings) => {
    renderWithDate(pairings, night);

    expectOnlyTheNote();
  });

  it('with no date picked: hides a made schedule, even one that has a rematch', () => {
    renderWithDate(onePair(10, true), null);

    expectOnlyTheNote();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('with a date and one pair: shows the pair and not the note', () => {
    renderWithDate(onePair(10), night);

    expect(screen.queryByText(EMPTY_NOTE)).not.toBeInTheDocument();
    expect(screen.getByText('Generated Match Pairings')).toBeInTheDocument();
    expect(screen.getByText('1 Matches')).toBeInTheDocument();
    expect(screen.getAllByText(/^Score: /)).toHaveLength(1);
  });
});
