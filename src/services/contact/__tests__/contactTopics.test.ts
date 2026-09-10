import { describe, expect, it } from 'vitest';

import {
  CONTACT_TOPIC_OPTIONS,
  CONTACT_TOPICS,
  findContactTopic,
  messageLimitFor,
  topicNeedsEmail,
} from '../contactTopics';

/** Fails loudly rather than asserting non-null on every line. */
const topic = (value: string) => {
  const found = findContactTopic(value);
  if (!found) throw new Error(`No such contact topic: ${value}`);
  return found;
};

describe('contactTopics', () => {
  it('offers every topic exactly once', () => {
    expect(CONTACT_TOPIC_OPTIONS.map((t) => t.value).sort()).toEqual([...CONTACT_TOPICS].sort());
  });

  it('covers both of the old forms vocabularies', () => {
    const values = CONTACT_TOPIC_OPTIONS.map((t) => t.value);
    // From the home form.
    expect(values).toContain('timeslot');
    expect(values).toContain('score');
    expect(values).toContain('join_league');
    // From the support form.
    expect(values).toContain('bug');
    expect(values).toContain('account');
    expect(values).toContain('feature');
  });

  it('gives every topic somewhere to land', () => {
    for (const topic of CONTACT_TOPIC_OPTIONS) {
      if (topic.channel === 'league') {
        expect(topic.requestType, topic.value).toBeDefined();
        expect(topic.subject, topic.value).toBeUndefined();
      } else {
        expect(topic.subject, topic.value).toBeDefined();
        expect(topic.requestType, topic.value).toBeUndefined();
      }
    }
  });

  it('gives every topic a label and a line of help', () => {
    for (const topic of CONTACT_TOPIC_OPTIONS) {
      expect(topic.label.length, topic.value).toBeGreaterThan(0);
      expect(topic.helper.length, topic.value).toBeGreaterThan(0);
    }
  });

  it('asks for a team and its players only when joining the league', () => {
    const needsTeam = CONTACT_TOPIC_OPTIONS.filter((t) => t.needsTeam).map((t) => t.value);
    const needsPlayers = CONTACT_TOPIC_OPTIONS.filter((t) => t.needsPlayers).map((t) => t.value);
    expect(needsTeam).toEqual(['join_league']);
    expect(needsPlayers).toEqual(['join_league']);
  });

  // The support inbox answers by email, so it cannot take a phone number.
  it('needs a real email address only for the topics answered by email', () => {
    expect(topicNeedsEmail(topic('bug'))).toBe(true);
    expect(topicNeedsEmail(topic('timeslot'))).toBe(false);
  });

  it('uses each inbox own message limit', () => {
    expect(messageLimitFor(topic('bug'))).toBe(5000);
    expect(messageLimitFor(topic('timeslot'))).toBe(2000);
  });

  describe('findContactTopic', () => {
    it('finds a topic by its value', () => {
      expect(findContactTopic('join_league')?.label).toBe('Join the league');
    });

    it('is null for anything it does not know', () => {
      expect(findContactTopic('nonsense')).toBeNull();
      expect(findContactTopic(null)).toBeNull();
      expect(findContactTopic(undefined)).toBeNull();
      expect(findContactTopic('')).toBeNull();
    });
  });
});
