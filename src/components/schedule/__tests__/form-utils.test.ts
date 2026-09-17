import { describe, expect, it } from 'vitest';

import { buildMatchSubmission, describeUnsavableMatch } from '../form-utils';
import type { MatchFormValues } from '../types';

const values = (overrides: Partial<MatchFormValues> = {}): MatchFormValues => ({
  team1Id: 'team-a',
  team2Id: 'team-b',
  date: new Date('2026-05-01T12:00:00Z'),
  timeSlot: '18:00',
  isCompleted: false,
  ...overrides,
});

describe('describeUnsavableMatch', () => {
  /**
   * Equal scores leave determineMatchOutcome with no winner, and no writer can
   * store a completed match without one -- the result RPCs are gated on a
   * winner and a loser, and the plain update excludes iscompleted by type. The
   * save used to drop the completion and report success anyway.
   */
  it('refuses a completed match whose scores are equal', () => {
    expect(
      describeUnsavableMatch(values({ isCompleted: true, team1Score: 15, team2Score: 15 }))
    ).toMatch(/needs a winner/i);
  });

  it('refuses a completed match with no scores at all', () => {
    // Both undefined are equal too, so this is the same no-winner payload.
    expect(describeUnsavableMatch(values({ isCompleted: true }))).toMatch(/needs a winner/i);
  });

  it('allows a completed match with a decisive score', () => {
    expect(
      describeUnsavableMatch(values({ isCompleted: true, team1Score: 21, team2Score: 15 }))
    ).toBeNull();
  });

  it('allows equal scores while the match stays open', () => {
    // The rule is about completion, not about the numbers on their own.
    expect(
      describeUnsavableMatch(values({ isCompleted: false, team1Score: 15, team2Score: 15 }))
    ).toBeNull();
  });

  it('does not mention the unresolved-matches queue', () => {
    // That queue only confirms a tie that already exists; nothing in the app
    // can create one, so pointing an admin there would be a dead end.
    const message = describeUnsavableMatch(
      values({ isCompleted: true, team1Score: 15, team2Score: 15 })
    );
    expect(message).not.toMatch(/unresolved|tie/i);
  });
});

describe('buildMatchSubmission', () => {
  it('carries the scores and the decided winner on a completed match', () => {
    const payload = buildMatchSubmission(
      values({ isCompleted: true, team1Score: 21, team2Score: 15 })
    );

    expect(payload).toMatchObject({
      team1Id: 'team-a',
      team2Id: 'team-b',
      iscompleted: true,
      team1Score: 21,
      team2Score: 15,
      winnerId: 'team-a',
      loserId: 'team-b',
      timeSlot: '18:00',
    });
  });

  it('names the second team when it has the higher score', () => {
    const payload = buildMatchSubmission(
      values({ isCompleted: true, team1Score: 15, team2Score: 21 })
    );

    expect(payload).toMatchObject({ winnerId: 'team-b', loserId: 'team-a' });
  });

  it('leaves the scores off an open match, so reopening clears a stale result', () => {
    const payload = buildMatchSubmission(
      values({ isCompleted: false, team1Score: 21, team2Score: 15 })
    );

    expect(payload.iscompleted).toBe(false);
    expect(payload.team1Score).toBeUndefined();
    expect(payload.team2Score).toBeUndefined();
    expect(payload.winnerId).toBeUndefined();
    expect(payload.loserId).toBeUndefined();
  });

  it('sends the date as an ISO string', () => {
    const payload = buildMatchSubmission(values());

    expect(payload.date).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(payload.date as string))).toBe(false);
  });
});
