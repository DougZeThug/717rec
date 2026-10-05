const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
 * wrapped pattern. That matters when the query ends in a lone backslash: it
 * escapes the closing `%`, which then matches a literal percent sign instead of
 * any run of characters. Reading the query alone would miss that.
 */
export const matchesIlikeContains = (text: string, query: string): boolean => {
  const wrapped = `%${query}%`;
  let pattern = '';
  for (let i = 0; i < wrapped.length; i += 1) {
    const char = wrapped[i];
    if (char === '\\' && i + 1 < wrapped.length) {
      i += 1;
      pattern += escapeRegExp(wrapped[i]);
    } else if (char === '%') {
      pattern += '.*';
    } else if (char === '_') {
      pattern += '.';
    } else {
      pattern += escapeRegExp(char);
    }
  }
  // Anchored, because ILIKE matches the whole string: the wrapping `%` is what
  // makes this a "contains" search. 's' lets the wildcards cross line breaks,
  // as they do in Postgres.
  return new RegExp(`^${pattern}$`, 'is').test(text);
};
