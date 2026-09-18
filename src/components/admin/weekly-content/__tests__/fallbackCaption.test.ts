import { describe, expect, it } from 'vitest';

import type { RecapFactsV1 } from '@/types/recapEdition';

import { buildFallbackCaption } from '../fallbackCaption';

const facts = (overrides: Partial<RecapFactsV1> = {}): RecapFactsV1 => ({
  factsSchemaVersion: 1,
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
  unresolvedMatchCount: 0,
  generatedAt: '2026-10-16T12:00:00.000Z',
  ...overrides,
});

describe('buildFallbackCaption', () => {
  // The whole point: the box is never empty, so Publish is never blocked on an
  // AI service being reachable.
  it('always produces something, even for an empty week', () => {
    const caption = buildFallbackCaption(facts());

    expect(caption.trim()).not.toBe('');
    expect(caption).toContain('Week 6');
  });

  it('says nothing at all about sections that are empty', () => {
    const caption = buildFallbackCaption(facts());

    expect(caption).not.toMatch(/in a row/);
    expect(caption).not.toMatch(/Biggest mover/);
    expect(caption).not.toMatch(/undefined|null|NaN/);
  });

  it('states the upset with the same odds the graphic shows', () => {
    const caption = buildFallbackCaption(
      facts({
        upsets: [
          {
            winnerId: 'w',
            winnerName: 'Bag Chasers',
            winnerPowerScore: 40,
            loserId: 'l',
            loserName: 'Corn Stars',
            loserPowerScore: 80,
            powerScoreGap: 40,
            winnerProbability: 0.18,
            matchResult: '2–1',
            weekNumber: 6,
          },
        ],
      })
    );

    expect(caption).toContain('Bag Chasers beat Corn Stars 2–1');
    expect(caption).toContain('18% shot');
  });

  it('names each division leader', () => {
    const caption = buildFallbackCaption(
      facts({
        divisions: [
          {
            divisionId: 'd-1',
            divisionName: 'Competitive',
            standings: [
              {
                rank: 1,
                teamId: 't-1',
                teamName: 'Corn Stars',
                logoUrl: null,
                wins: 7,
                losses: 1,
                gameWins: 15,
                gameLosses: 4,
                powerScore: 88,
                delta: 1,
              },
            ],
          },
        ],
      })
    );

    expect(caption).toContain('Competitive: Corn Stars lead at 7–1.');
  });

  it('reports the biggest mover with both numbers', () => {
    const caption = buildFallbackCaption(
      facts({
        teamOfTheWeek: {
          teamId: 'm',
          teamName: 'Rising Sacks',
          logoUrl: null,
          division: 'Competitive',
          currentScore: 64.2,
          previousScore: 60,
          delta: 4.2,
        },
      })
    );

    expect(caption).toContain('Rising Sacks, up 4.2 to 64.2');
  });
});
