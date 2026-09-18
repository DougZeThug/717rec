import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecapFactsV1, RecapTeamGrade } from '@/types/recapEdition';

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mockInvoke } },
}));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn() }));

import { CaptionUnconfiguredError, generateBlurbs, generateCaption } from '../CaptionService';

const team = (overrides: Partial<RecapTeamGrade> = {}): RecapTeamGrade => ({
  rank: 1,
  previousRank: 2,
  teamId: '11111111-1111-4111-8111-111111111111',
  teamName: 'Bag Chasers',
  logoUrl: 'https://cdn.example/logo.png',
  division: 'Competitive',
  grade: 'A',
  gpa: 3.8,
  categories: [{ key: 'overall', label: 'Overall', grade: 'A', percentile: 92 }],
  wins: 6,
  losses: 2,
  powerScore: 72.4,
  delta: 2.1,
  ...overrides,
});

const facts = (powerRankings: RecapTeamGrade[]): RecapFactsV1 => ({
  factsSchemaVersion: 2,
  seasonId: 's-1',
  seasonName: 'Fall 2026',
  seasonSlug: 'fall-2026',
  weekNumber: 6,
  weekStartIso: '2026-10-09T04:00:00.000Z',
  weekEndIso: '2026-10-16T04:00:00.000Z',
  upsets: [],
  hotStreaks: [],
  movers: { basis: 'compared', currentWeek: 6, previousWeek: 5, risers: [], faller: null },
  teamOfTheWeek: null,
  divisions: [],
  powerRankings,
  unresolvedMatchCount: 0,
  generatedAt: '2026-10-16T12:00:00.000Z',
});

const sentBody = () => mockInvoke.mock.calls[0][1].body;

describe('generateBlurbs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      data: { blurbs: { a: 'x' }, model: 'claude-opus-5' },
      error: null,
    });
  });

  it('asks for the rankings mode, not a caption', async () => {
    await generateBlurbs(facts([team()]), '');
    expect(sentBody().kind).toBe('rankings');
  });

  it('sends what a blurb can be written from, and nothing else', async () => {
    await generateBlurbs(facts([team()]), '');

    const sent = sentBody().facts.teams[0];
    expect(Object.keys(sent).sort()).toEqual([
      'delta',
      'division',
      'grade',
      'losses',
      'powerScore',
      'previousRank',
      'rank',
      'teamId',
      'teamName',
      'wins',
    ]);
    // No opponents anywhere: the writer must not be able to say a team beat
    // somebody, because the facts do not record who played whom.
    expect(JSON.stringify(sentBody())).not.toContain('opponent');
    // No logo either — it has no use for one.
    expect(JSON.stringify(sentBody())).not.toContain('cdn.example');
  });

  it('passes a team with no rating through as null rather than inventing one', async () => {
    await generateBlurbs(facts([team({ grade: null, powerScore: null, previousRank: null })]), '');

    const sent = sentBody().facts.teams[0];
    expect(sent.grade).toBeNull();
    expect(sent.powerScore).toBeNull();
    expect(sent.previousRank).toBeNull();
  });

  it('sends the commissioner note when there is one, and omits it when blank', async () => {
    await generateBlurbs(facts([team()]), '  Somebody finally beat their brother.  ');
    expect(sentBody().commissionerNote).toBe('Somebody finally beat their brother.');

    mockInvoke.mockClear();
    await generateBlurbs(facts([team()]), '   ');
    expect(sentBody().commissionerNote).toBeUndefined();
  });

  it('caps an oversized league rather than sending it all', async () => {
    const many = Array.from({ length: 50 }, (_, i) => team({ teamId: `t-${i}`, rank: i + 1 }));
    await generateBlurbs(facts(many), '');

    expect(sentBody().facts.teams).toHaveLength(40);
  });

  it('does not call out at all when there are no ranked teams', async () => {
    await expect(generateBlurbs(facts([]), '')).rejects.toThrow(/no ranked teams/i);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('returns the blurbs and the model that wrote them', async () => {
    const result = await generateBlurbs(facts([team()]), '');
    expect(result).toEqual({ blurbs: { a: 'x' }, model: 'claude-opus-5' });
  });

  it('tells "not set up" apart from "it broke"', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: Object.assign(new Error('failed'), { context: { status: 503 } }),
    });

    await expect(generateBlurbs(facts([team()]), '')).rejects.toBeInstanceOf(
      CaptionUnconfiguredError
    );
  });

  it('raises an ordinary failure for any other error', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: Object.assign(new Error('boom'), { context: { status: 502 } }),
    });

    const caught = await generateBlurbs(facts([team()]), '').catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(CaptionUnconfiguredError);
  });

  it('refuses an empty reply rather than wiping the lines already there', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { blurbs: {}, model: 'm' }, error: null });
    await expect(generateBlurbs(facts([team()]), '')).rejects.toThrow(/came back empty/i);
  });
});

describe('generateCaption', () => {
  const week = (overrides: Partial<RecapFactsV1> = {}): RecapFactsV1 => ({
    ...facts([]),
    upsets: [
      {
        winnerId: 'w',
        winnerName: 'Bag Chasers',
        winnerLogoUrl: 'https://cdn.example/w.png',
        winnerPowerScore: 40,
        loserId: 'l',
        loserName: 'Corn Stars',
        loserPowerScore: 80,
        powerScoreGap: 40,
        winnerProbability: 0.18,
        matchResult: '2-1',
        weekNumber: 6,
      },
    ] as never,
    hotStreaks: [
      { teamId: 't', teamName: 'Toss Bosses', streakCount: 4, division: 'Competitive' },
    ] as never,
    teamOfTheWeek: {
      teamId: 't-1',
      teamName: 'Bag Chasers',
      logoUrl: 'https://cdn.example/w.png',
      division: 'Competitive',
      currentScore: 72,
      previousScore: 68,
      delta: 4,
    },
    divisions: [
      {
        divisionId: 'd-1',
        divisionName: 'Competitive',
        standings: [
          {
            rank: 1,
            teamId: 'a',
            teamName: 'Leaders',
            logoUrl: null,
            wins: 8,
            losses: 1,
            gameWins: 17,
            gameLosses: 4,
            powerScore: 80,
            delta: 1,
          },
          {
            rank: 2,
            teamId: 'b',
            teamName: 'Runners Up',
            logoUrl: null,
            wins: 7,
            losses: 2,
            gameWins: 15,
            gameLosses: 6,
            powerScore: 75,
            delta: 0,
          },
        ],
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    // The other describe clears in its own beforeEach; without this, sentBody()
    // reads the call left over from the rankings tests.
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      data: { caption: 'A caption.', model: 'claude-opus-5' },
      error: null,
    });
  });

  it('asks for a caption, not the rankings mode', async () => {
    await generateCaption(week(), '');
    expect(sentBody().kind).toBeUndefined();
    expect(sentBody().tone).toBe('straight');
  });

  it('sends names and numbers, and strips the ids and logos', async () => {
    await generateCaption(week(), '');

    const sent = sentBody().facts;
    expect(sent.upsets[0]).toEqual({
      winnerName: 'Bag Chasers',
      loserName: 'Corn Stars',
      matchResult: '2-1',
      winnerProbability: 0.18,
    });
    // The writer has no use for ids or logo URLs, so they are not sent.
    expect(JSON.stringify(sent)).not.toContain('cdn.example');
    expect(JSON.stringify(sent)).not.toContain('winnerId');
  });

  it('names only each division leader, not the whole table', async () => {
    await generateCaption(week(), '');

    expect(sentBody().facts.divisionLeaders).toEqual([
      { divisionName: 'Competitive', teamName: 'Leaders', wins: 8, losses: 1 },
    ]);
  });

  it('omits a division that has nobody in it', async () => {
    await generateCaption(
      week({ divisions: [{ divisionId: 'd-2', divisionName: 'Empty', standings: [] }] }),
      ''
    );

    expect(sentBody().facts.divisionLeaders).toEqual([]);
  });

  it('passes the tone through', async () => {
    await generateCaption(week(), '', 'playful');
    expect(sentBody().tone).toBe('playful');
  });

  it('returns the caption and the model that wrote it', async () => {
    const result = await generateCaption(week(), '');
    expect(result).toEqual({ caption: 'A caption.', model: 'claude-opus-5' });
  });

  it('tells "not set up" apart from "it broke"', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: Object.assign(new Error('failed'), { context: { status: 503 } }),
    });

    await expect(generateCaption(week(), '')).rejects.toBeInstanceOf(CaptionUnconfiguredError);
  });

  it('refuses an empty caption rather than publishing a blank one', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { caption: '', model: 'm' }, error: null });
    await expect(generateCaption(week(), '')).rejects.toThrow(/came back empty/i);
  });
});
