/**
 * Sanitizes a return URL to prevent open redirect attacks.
 * Only allows internal paths starting with a single slash.
 *
 * @param pathname - The path to validate
 * @returns Safe internal path or '/' as fallback
 */
export const sanitizeReturnTo = (pathname: string | undefined): string => {
  // Default to home if no path provided
  if (!pathname) return '/';

  // Must start with exactly one slash (not protocol-relative //)
  // and not contain any protocol indicators
  if (
    pathname.startsWith('/') &&
    !pathname.startsWith('//') &&
    !pathname.includes(':')
  ) {
    return pathname;
  }

  return '/';
};
