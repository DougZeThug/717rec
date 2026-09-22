// Spam signals shared by the public message endpoints (send-support-email and
// submit-contact-request). It lives here because both endpoints carried their
// own copy of countUrls, and both copies carried the same bug.

/**
 * How many links a message contains.
 *
 * Each match starts where a link starts — a scheme, or a bare `www.` host — and
 * then runs to the end of that link. Consuming the body is what stops a second
 * count *inside* a link that has already been counted. A Wayback snapshot like
 * `https://web.archive.org/web/20230101/https://www.example.com` carries two
 * more openings in its path, and a redirect like
 * `https://example.com/r?to=www.target.com` carries one. Every one of them used
 * to score.
 *
 * Three snapshots scored six against a limit documented as five, so a sender
 * quoting three archived pages was refused as a spammer and told the message
 * held too many links. It held three. Retrying the same text never worked.
 *
 * The body is a list of the characters a URL may contain, and it stops at
 * anything else. That is the other half of the rule, and it is why the tail is
 * not a plain `\S+` and not a blacklist either.
 *
 * A greedy `\S+` runs straight through the punctuation between two links, so
 * `https://a.test,https://b.test` reads as one and a sender gets any number
 * past the limit by leaving out the spaces. A blacklist -- "anything except
 * whitespace, a comma, a semicolon, a bracket or a quote" -- has the same hole
 * one character over: `https://a.test|https://b.test` joined on a pipe read as
 * one link, and six of them scored 1 against a limit of 5. Every character not
 * on the blacklist was another way through.
 *
 * Naming the characters instead means no separator has to be predicted:
 * anything not on the list ends the link. But the list has to contain `/`, `.`,
 * `-`, `:` and the rest, because links carry them — and those can join two
 * links just as well as a pipe can. `https://a.test-https://b.test` ran into
 * one match again.
 *
 * So the body also stops at a second link's opening, unless that opening sits
 * where a path or a query value would put one: straight after a `/` or an `=`.
 * That is what keeps a Wayback snapshot and a `?to=` redirect counted once,
 * which is the whole point of the rule, while a flood joined on any other
 * character is counted link by link.
 *
 * The `=` case is the one gap left, and it is deliberate. `a=b` is where a URL
 * legitimately carries another URL, so links joined on `=` still read as one.
 * Closing it would mean counting `?to=www.target.com` as two links, which is
 * the false refusal this whole function exists to avoid. Under-counting a
 * contrived evasion is the better error of the two here.
 *
 * A `www.` directly after a scheme needs no special case any more: the scheme
 * matches first and the tail eats the host.
 *
 * Bare `www.example.com` links still count. Dropping them would be the opposite
 * mistake — six of them would score zero.
 */
export function countUrls(text: string): number {
  const matches = text.match(
    /(?:https?:\/\/|www\.)(?:(?!(?<![/=])(?:https?:\/\/|www\.))[A-Za-z0-9._~:/?#@!$&*+=%-])*/gi
  );
  return matches ? matches.length : 0;
}

/** More links than this in one message reads as spam. */
export const MAX_URLS_PER_MESSAGE = 5;
