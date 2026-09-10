import { describe, expect, it } from 'vitest';

// Read as text through Vite rather than the filesystem, the same way
// `routeName.test.ts` does: a static import needs no working directory, so the
// test does not care where vitest was started from.
import appSource from '@/App.tsx?raw';
import userMenuSource from '@/components/auth/UserMenu.tsx?raw';
import helpQuickLinksSource from '@/components/help/HelpQuickLinks.tsx?raw';
import navLinksSource from '@/components/layout/navbar/NavLinks.tsx?raw';
import bottomNavSource from '@/components/navigation/BottomNav.tsx?raw';
import commandPaletteSource from '@/components/navigation/CommandPalette.tsx?raw';

/**
 * UX audit X-02's acceptance criterion: *every route in `App.tsx` is reachable
 * from at least one of header, bottom bar, user menu or palette.*
 *
 * Four navigation surfaces used to disagree about what the app contained, and
 * `/compare` was reachable only by typing its address. Nothing stopped that
 * happening again, so this is the guard: add a route and forget to put it in a
 * menu, and this fails naming the route.
 */
describe('every route is reachable from a menu', () => {
  // Rendered only when import.meta.env.DEV — an e2e harness, not a page anyone
  // can reach.
  const devOnly = ['/playoffs/e2e-bracket-proof'];

  // These render nothing of their own; they redirect somewhere that is in a menu.
  const redirectOnly = ['/timeslots', '/admin/notifications'];

  // Reached by doing something rather than by choosing it from a list.
  const reachedInContext: Record<string, string> = {
    '/teams/:teamId': 'a team name on the teams list, a standings row or a match card',
    '/matches/:matchId/live': 'a match card on the schedule or the home page',
    '/admin/:section': 'the admin console menu, once /admin is open',
    '/auth': 'the Login button in the header',
    '/forgot-password': 'a link on the sign-in form',
    '/reset-password': 'the link in the password reset email',
    '/setup-profile': 'the user menu, and the redirect after signing up',
    '/oauth/consent': 'another app starting an authorisation',
    '*': 'the not-found page; nothing links to it on purpose',
  };

  const menuSources = [
    navLinksSource,
    bottomNavSource,
    commandPaletteSource,
    userMenuSource,
    helpQuickLinksSource,
  ].join('\n');

  const declared = [...appSource.matchAll(/path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => ![...devOnly, ...redirectOnly].includes(path));

  it('reads the route list out of App.tsx', () => {
    // Without this the test passes vacuously if the source ever reads empty,
    // which is the one way a coverage check like this quietly stops working.
    expect(declared).toContain('/schedule');
    expect(declared).toContain('/compare');
    expect(declared.length).toBeGreaterThan(10);
    expect(menuSources.length).toBeGreaterThan(1000);
  });

  it('offers every route from the header, bottom bar, user menu or palette', () => {
    const unreachable = declared
      .filter((path) => !(path in reachedInContext))
      .filter((path) => !menuSources.includes(`'${path}'`) && !menuSources.includes(`"${path}"`));

    expect(unreachable).toEqual([]);
  });

  it('keeps the two pages X-02 found orphaned in a menu', () => {
    // /compare was URL-only and /insights was a button on /stats alone.
    expect(commandPaletteSource).toContain("'/compare'");
    expect(commandPaletteSource).toContain("'/insights'");
    expect(helpQuickLinksSource).toContain('"/compare"');
    expect(helpQuickLinksSource).toContain('"/insights"');
  });

  it('offers the admin console outside the user menu', () => {
    // X-03: the user menu used to be the only link to /admin in the whole app.
    expect(navLinksSource).toContain("'/admin'");
  });
});
