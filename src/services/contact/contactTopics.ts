import type { ContactRequestType } from './ContactRequestService';

/**
 * What a message can be about, as one list.
 *
 * UX audit H-02: the app had two message forms with different field sets, each
 * telling the reader to use the other one. The forms are one form now; this is
 * the union of the two vocabularies they used to keep apart.
 *
 * Two mailboxes are still behind it. The topic decides which — the league's own
 * request inbox, which knows about teams and verifies who is asking, or the
 * support inbox, which emails the admins. A reader never sees that split, and
 * the admin inbox already showed both in one list (B-10).
 */
export const CONTACT_TOPICS = [
  'timeslot',
  'score',
  'join_league',
  'bug',
  'account',
  'feature',
  'general',
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

/** Which inbox a topic lands in. Never shown to the reader. */
type ContactChannel = 'league' | 'support';

export interface ContactTopicDefinition {
  value: ContactTopic;
  label: string;
  helper: string;
  channel: ContactChannel;
  /** The league inbox's own code for this topic. */
  requestType?: ContactRequestType;
  /** The support inbox's own code for this topic. */
  subject?: string;
  /** Asks for a team name, and requires one. */
  needsTeam?: boolean;
  /** Asks who else is playing. */
  needsPlayers?: boolean;
}

export const CONTACT_TOPIC_OPTIONS: readonly ContactTopicDefinition[] = [
  {
    value: 'timeslot',
    label: 'Timeslot request',
    helper: 'Reschedule or swap a match time.',
    channel: 'league',
    requestType: 'timeslot',
  },
  {
    value: 'score',
    label: 'Score update or correction',
    helper: 'Report or fix a match score.',
    channel: 'league',
    requestType: 'score',
  },
  {
    value: 'join_league',
    label: 'Join the league',
    helper: 'Register a new team for an upcoming season.',
    channel: 'league',
    requestType: 'join_league',
    needsTeam: true,
    needsPlayers: true,
  },
  {
    value: 'bug',
    label: 'Report a bug',
    helper: 'Something on the site is broken or wrong.',
    channel: 'support',
    subject: 'bug_report',
  },
  {
    value: 'account',
    label: 'Account problem',
    helper: 'Signing in, your profile, or your team membership.',
    channel: 'support',
    subject: 'account_issue',
  },
  {
    value: 'feature',
    label: 'Suggest an improvement',
    helper: 'An idea for something the site could do.',
    channel: 'support',
    subject: 'feature_request',
  },
  {
    // The label stays "General question" — it is the wording the old support
    // form used and the one people recognise.
    value: 'general',
    label: 'General question',
    helper: 'Anything else you want the admins to see.',
    channel: 'league',
    requestType: 'general',
  },
];

export const DEFAULT_CONTACT_TOPIC: ContactTopic = 'general';

const BY_VALUE = new Map(CONTACT_TOPIC_OPTIONS.map((topic) => [topic.value, topic]));

/** The topic for a value, or null. Used for `?type=` and for anything stored. */
export const findContactTopic = (value: string | null | undefined): ContactTopicDefinition | null =>
  (value && BY_VALUE.get(value as ContactTopic)) || null;

/**
 * Whether this topic needs a real email address.
 *
 * The support inbox emails the admins back, so it cannot take a phone number.
 * The league inbox can, and a rec league has members who would rather give one.
 */
export const topicNeedsEmail = (topic: ContactTopicDefinition): boolean =>
  topic.channel === 'support';

/** The longest message each inbox accepts, matching its edge function. */
export const messageLimitFor = (topic: ContactTopicDefinition): number =>
  topic.channel === 'support' ? 5000 : 2000;
