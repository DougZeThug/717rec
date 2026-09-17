import type { Team } from '@/types';
import { toTeamSlug } from '@/utils/teamSlug';

const SITE_ORIGIN = 'https://717rec.app';

/** Schema.org needs an absolute URL, so a relative upload path is no use here. */
const isAbsoluteUrl = (value?: string | null): value is string =>
  Boolean(value) && /^https?:\/\//.test(value as string);

/** Prefer the logo, fall back to the team image, and omit the field entirely if neither is absolute. */
const pickLogo = (team: Pick<Team, 'logoUrl' | 'imageUrl'>): string | undefined => {
  if (isAbsoluteUrl(team.logoUrl)) return team.logoUrl;
  if (isAbsoluteUrl(team.imageUrl)) return team.imageUrl;
  return undefined;
};

/**
 * The one address a team page declares as its own.
 *
 * A team answers at two addresses -- the readable name and the row id -- and the
 * page used to echo back whichever one the visitor arrived at, so the same team
 * told search engines it was two different pages, each the original.
 *
 * The readable name is the better address, but only when it actually leads
 * here. `teams.name` has no unique constraint and `toTeamSlug` is lossy on top
 * of that, so two teams can reduce to one address, and it reaches whichever of
 * them `useResolveTeamSlug` finds first. Handing both that address would be
 * worse than the bug this replaced: the loser would publish a canonical
 * pointing at somebody else's page.
 *
 * So apply the resolver's own test -- first match wins -- and fall back to the
 * row id whenever it does not come back to this team. Also when the roster of
 * names has not loaded, because "it leads here" is not a claim you can make
 * before you can see the others, and when the name reduces to nothing, which
 * would otherwise emit `/teams/`, the teams list.
 */
export const toTeamCanonicalPath = (
  team: Pick<Team, 'id' | 'name'>,
  allTeams?: Pick<Team, 'id' | 'name'>[] | null
): string => {
  const slug = toTeamSlug(team.name);
  if (!slug || !allTeams) return `/teams/${team.id}`;
  const resolved = allTeams.find((other) => toTeamSlug(other.name) === slug);
  return resolved?.id === team.id ? `/teams/${slug}` : `/teams/${team.id}`;
};

/** Turn a 0–1 fraction into a percentage, treating a missing value as zero. */
export const toPercent = (fraction?: number | null): number => (fraction ? fraction * 100 : 0);

export interface TeamSeo {
  /** Canonical absolute URL for the team page. */
  url: string;
  /** Schema.org SportsTeam document for the page head. */
  jsonLd: Record<string, unknown>;
  /** Meta description sentence. */
  description: string;
}

/**
 * Build the SEO payload for a team page.
 *
 * Lives here rather than inline in the page so the optional-field handling —
 * which logo counts, whether a division or roster is present — can be tested
 * without rendering the page.
 */
export const buildTeamSeo = (team: Team, teamPath: string): TeamSeo => {
  const url = `${SITE_ORIGIN}${teamPath}`;
  const logo = pickLogo(team);
  const hasRoster = Boolean(team.players && team.players.length > 0);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    sport: 'Cornhole',
    url,
    // The division belongs beside the league, not under the team. It used to be
    // published as `subOrganization`, which says the team owns the division --
    // the reverse of the truth -- and as a bare string, where Schema.org wants
    // an Organization node.
    memberOf: [
      {
        '@type': 'SportsOrganization',
        name: '717REC',
        url: `${SITE_ORIGIN}/`,
      },
      ...(team.divisionName ? [{ '@type': 'SportsOrganization', name: team.divisionName }] : []),
    ],
    ...(logo ? { logo } : {}),
    ...(hasRoster
      ? { athlete: (team.players ?? []).map((name) => ({ '@type': 'Person', name })) }
      : {}),
  };

  const parts = [
    `${team.name} — 717REC cornhole team`,
    team.divisionName ? `${team.divisionName} division` : null,
    `${team.wins ?? 0}-${team.losses ?? 0} record`,
  ].filter(Boolean);

  return { url, jsonLd, description: `${parts.join(', ')}. Roster, stats, and match history.` };
};
