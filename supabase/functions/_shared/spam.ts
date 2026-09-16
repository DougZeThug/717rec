// Spam signals shared by the public message endpoints (send-support-email and
// submit-contact-request). It lives here because both endpoints carried their
// own copy of countUrls, and both copies carried the same bug.

/**
 * How many links a message contains.
 *
 * Each link is counted once. The earlier version alternated between the two
 * ways a link can start — `/https?:\/\/|www\./gi` — which matched twice inside
 * a single `https://www.example.com`: once for the scheme and again for the
 * host prefix. Three ordinary links scored six and tripped a limit documented
 * as five, so a sender quoting three videos was refused as a spammer with only
 * the generic "please try again" toast to go on, and retrying the same text
 * could never work.
 *
 * Consuming the rest of the link with `\S+` is what fixes it: the `www.` of a
 * scheme-prefixed link is now part of the match the scheme already started.
 * Bare `www.example.com` links, which carry no scheme, still count — dropping
 * them would let six of them past the limit.
 */
export function countUrls(text: string): number {
  const matches = text.match(/(?:https?:\/\/|www\.)\S+/gi);
  return matches ? matches.length : 0;
}

/** More links than this in one message reads as spam. */
export const MAX_URLS_PER_MESSAGE = 5;
