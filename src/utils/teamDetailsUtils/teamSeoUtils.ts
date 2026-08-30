import type { Team } from '@/types';

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
    memberOf: {
      '@type': 'SportsOrganization',
      name: '717REC',
      url: `${SITE_ORIGIN}/`,
    },
    ...(logo ? { logo } : {}),
    ...(team.divisionName ? { subOrganization: team.divisionName } : {}),
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
