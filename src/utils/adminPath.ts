/**
 * Where the admin console lives, as a question about an address.
 *
 * Deliberately its own module with no imports. It used to sit in `adminTabs`,
 * which reaches `adminSections` for the section list — and `adminSections`
 * declares fourteen `lazy()` components at module scope, so Rollup cannot drop
 * any of it. The header and the user menu render on every page, so importing
 * one string predicate from there pulled the whole admin section table, and its
 * icons, into the bundle every visitor downloads.
 */

/**
 * Is this address inside the admin console?
 *
 * Links into a bare `/admin` need to know. From outside the console it opens
 * the remembered section, which is what they are for. From inside, the
 * remembered section is the one already on screen, so the redirect lands back
 * where it started — but on the way the dashboard returns `<Navigate>` in place
 * of its own subtree, which tears the section down and builds a fresh one.
 * Sections keep their unsaved work in component state, so the round trip throws
 * it away, and no guard runs because nothing was ever asked. A link with
 * nowhere to go should go nowhere instead.
 */
export const isAdminConsolePath = (pathname: string): boolean => {
  // The console serves `/admin` and `/admin/:section` — one segment, no more.
  // A deeper address like `/admin/scores/typo` matches neither and lands on the
  // not-found page, where the link has to work: treating it as an open console
  // would leave an admin stranded with a dead Admin link and no way back in.
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] === 'admin' && segments.length <= 2;
};
