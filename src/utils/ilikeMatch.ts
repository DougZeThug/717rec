type Token = { char: string; any: boolean };

/** Find the first index >= from where `segment` matches `text` (`any` = one-char wildcard). */
const findSegment = (text: string[], segment: Token[], from: number): number => {
  for (let start = from; start + segment.length <= text.length; start += 1) {
    let ok = true;
    for (let j = 0; j < segment.length; j += 1) {
      const token = segment[j];
      if (!token.any && text[start + j] !== token.char) {
        ok = false;
        break;
      }
    }
    if (ok) return start;
  }
  return -1;
};

const segmentMatchesAt = (text: string[], segment: Token[], at: number): boolean =>
  at >= 0 && at + segment.length <= text.length && findSegment(text, segment, at) === at;

/**
 * Does `text` match the server's `ILIKE '%<query>%'` search?
 *
 * The message board searches with Postgres ILIKE, where `%` matches any run of
 * characters, `_` matches one character and a backslash makes the next
 * character literal. Code that decides on the client whether a message belongs
 * in a searched list must use the same rules, or it disagrees with the server
 * about which messages are results.
 *
 * The server builds the pattern as `%${query}%`, so this reads that same
 * wrapped pattern. A query ending in a lone backslash escapes the closing `%`,
 * which then matches a literal percent sign.
 *
 * This matcher does not build a regular expression. It splits the pattern at
 * `%` and finds each piece left to right, so a crafted query with many
 * wildcards cannot cause catastrophic backtracking and freeze the page.
 */
export const matchesIlikeContains = (text: string, query: string): boolean => {
  // Arrays of whole characters: Postgres counts a character, JS strings count
  // UTF-16 units, so an emoji would otherwise be two characters to `_`.
  const wrapped = Array.from(`%${query}%`.toLowerCase());
  const subject = Array.from(text.toLowerCase());
  const segments: Token[][] = [[]];
  for (let i = 0; i < wrapped.length; i += 1) {
    const char = wrapped[i];
    const current = segments[segments.length - 1];
    if (char === '\\' && i + 1 < wrapped.length) {
      i += 1;
      current.push({ char: wrapped[i], any: false });
    } else if (char === '%') {
      segments.push([]);
    } else if (char === '_') {
      current.push({ char: '', any: true });
    } else {
      current.push({ char, any: false });
    }
  }

  if (segments.length === 1) {
    const only = segments[0];
    return only.length === subject.length && segmentMatchesAt(subject, only, 0);
  }

  const first = segments[0];
  const last = segments[segments.length - 1];
  if (!segmentMatchesAt(subject, first, 0)) return false;
  let pos = first.length;
  for (let s = 1; s < segments.length - 1; s += 1) {
    const found = findSegment(subject, segments[s], pos);
    if (found === -1) return false;
    pos = found + segments[s].length;
  }
  const lastStart = subject.length - last.length;
  return lastStart >= pos && segmentMatchesAt(subject, last, lastStart);
};
