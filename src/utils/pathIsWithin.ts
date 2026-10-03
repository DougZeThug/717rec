/**
 * True when `pathname` is `to` or a page inside it, so `/teams/some-team` keeps
 * the Teams tab lit. `/` only matches itself, or it would light on every page.
 */
export const pathIsWithin = (pathname: string, to: string): boolean =>
  to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
