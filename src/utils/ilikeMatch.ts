const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Does `text` match the server's `ILIKE '%<query>%'` search?
 *
 * The message board searches with Postgres ILIKE, where `%` matches any run of
 * characters, `_` matches one character and a backslash makes the next
 * character literal. Code that decides on the client whether a message belongs
 * in a searched list must use the same rules, or it disagrees with the server
 * about which messages are results.
 */
export const matchesIlikeContains = (text: string, query: string): boolean => {
  let pattern = '';
  for (let i = 0; i < query.length; i += 1) {
    const char = query[i];
    if (char === '\\' && i + 1 < query.length) {
      i += 1;
      pattern += escapeRegExp(query[i]);
    } else if (char === '%') {
      pattern += '.*';
    } else if (char === '_') {
      pattern += '.';
    } else {
      pattern += escapeRegExp(char);
    }
  }
  // 's' lets the wildcards cross line breaks, as they do in Postgres.
  return new RegExp(pattern, 'is').test(text);
};
