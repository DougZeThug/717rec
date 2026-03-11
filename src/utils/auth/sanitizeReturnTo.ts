/**
 * Sanitizes a return URL to prevent open redirect attacks.
 * Only allows internal paths starting with a single slash.
 *
 * @param pathname - The path to validate
 * @returns Safe internal path or '/' as fallback
 */
export const sanitizeReturnTo = (pathname: string | undefined): string => {
  if (!pathname || typeof pathname !== 'string') return '/';

  // Ensure it starts with / and not // or /\
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.startsWith('/\\')) {
    return '/';
  }

  try {
    // Use a dummy base to parse the URL safely
    const url = new URL(pathname, 'http://localhost');

    // If the hostname changed from localhost, it's an external redirect
    if (url.hostname !== 'localhost') return '/';

    // Check for protocol indicators only in the pathname part (to prevent javascript:, etc.)
    // but allow them in query params/hash
    if (url.pathname.includes(':')) return '/';

    return pathname;
  } catch (_e) {
    return '/';
  }
};
