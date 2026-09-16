// Spam signals shared by the public message endpoints (send-support-email and
// submit-contact-request). It lives here because both endpoints carried their
// own copy of countUrls, and both copies carried the same bug.

/**
 * How many links a message contains.
 *
 * Counts where each link *starts*, rather than trying to consume the whole of
 * it. Two ways to start are recognised — a scheme, or a bare `www.` host — and
 * a `www.` directly after a scheme belongs to that scheme rather than opening a
 * link of its own.
 *
 * That last part is the fix for the original defect. The first version was a
 * plain alternation, `/https?:\/\/|www\./gi`, which matched twice inside a
 * single `https://www.example.com`: once for the scheme and again for the host.
 * Three ordinary links scored six and tripped a limit documented as five, so a
 * sender quoting three videos was refused as a spammer with only the generic
 * "please try again" toast to go on, and retrying the same text never worked.
 *
 * Counting starts is also why the body is not consumed with something like
 * `\S+`. A greedy tail runs through any punctuation between two links, so
 * `https://a.test,https://b.test` reads as one link and a sender could put any
 * number of them past the limit by leaving out the spaces. Matching only the
 * opening of each link cannot run them together.
 *
 * Bare `www.example.com` links still count. Dropping them would be the opposite
 * mistake — six of them would score zero.
 */
export function countUrls(text: string): number {
  const matches = text.match(/https?:\/\/(?:www\.)?|www\./gi);
  return matches ? matches.length : 0;
}

/** More links than this in one message reads as spam. */
export const MAX_URLS_PER_MESSAGE = 5;
