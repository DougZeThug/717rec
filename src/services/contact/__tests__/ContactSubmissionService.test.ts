import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLeagueSubmit = vi.fn();
const mockSupportSubmit = vi.fn();

vi.mock('../ContactRequestService', () => ({
  ContactRequestService: { submit: (...args: unknown[]) => mockLeagueSubmit(...args) },
}));

vi.mock('@/services/support/ContactService', () => ({
  submitContactRequest: (...args: unknown[]) => mockSupportSubmit(...args),
}));

import { submitContactMessage } from '../ContactSubmissionService';
import { findContactTopic } from '../contactTopics';

/** Fails loudly rather than asserting non-null on every line. */
const topic = (value: string) => {
  const found = findContactTopic(value);
  if (!found) throw new Error(`No such contact topic: ${value}`);
  return found;
};

const base = {
  name: 'Casey Captain',
  contact: 'captain@example.com',
  message: 'Please move our match.',
  website: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  // vi.fn() alone returns undefined, not a promise; this sets the resolved value.
  mockLeagueSubmit.mockResolvedValue(undefined); // skipcq: JS-W1042
  mockSupportSubmit.mockResolvedValue(undefined); // skipcq: JS-W1042
});

describe('submitContactMessage', () => {
  it('sends a league topic to the league inbox with its own code', async () => {
    await submitContactMessage({ ...base, topic: topic('timeslot') });

    expect(mockSupportSubmit).not.toHaveBeenCalled();
    expect(mockLeagueSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        request_type: 'timeslot',
        submitter_name: 'Casey Captain',
        submitter_contact: 'captain@example.com',
        message: 'Please move our match.',
      })
    );
  });

  it('sends a support topic to the support inbox with its own code', async () => {
    await submitContactMessage({
      ...base,
      topic: topic('bug'),
      message: 'The bracket will not open.',
    });

    expect(mockLeagueSubmit).not.toHaveBeenCalled();
    expect(mockSupportSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'bug_report',
        email: 'captain@example.com',
        message: 'The bracket will not open.',
      })
    );
  });

  it('passes the team and players on when joining the league', async () => {
    await submitContactMessage({
      ...base,
      topic: topic('join_league'),
      team: 'Bag Boys',
      players: 'Jo, Sam',
    });

    expect(mockLeagueSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ submitter_team: 'Bag Boys', players: 'Jo, Sam' })
    );
  });

  it('does not send players for a topic that never asked for them', async () => {
    await submitContactMessage({
      ...base,
      topic: topic('timeslot'),
      players: 'left over from an earlier choice',
    });

    expect(mockLeagueSubmit).toHaveBeenCalledWith(expect.objectContaining({ players: null }));
  });

  it('sends an empty team as nothing rather than an empty string', async () => {
    await submitContactMessage({ ...base, topic: topic('general'), team: '   ' });

    expect(mockLeagueSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ submitter_team: null })
    );
  });

  it('carries the honeypot through to both inboxes', async () => {
    await submitContactMessage({
      ...base,
      topic: topic('bug'),
      website: 'spam.example',
    });
    expect(mockSupportSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ website: 'spam.example' })
    );

    await submitContactMessage({
      ...base,
      topic: topic('score'),
      website: 'spam.example',
    });
    expect(mockLeagueSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ website: 'spam.example' })
    );
  });

  it('lets the inbox own failure through', async () => {
    mockLeagueSubmit.mockRejectedValue(new Error('Rate limit reached'));

    await expect(submitContactMessage({ ...base, topic: topic('timeslot') })).rejects.toThrow(
      'Rate limit reached'
    );
  });
});
