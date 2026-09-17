import { describe, expect, it } from 'vitest';

import type { Team } from '@/types';
import {
  buildTeamSeo,
  toPercent,
  toTeamCanonicalPath,
} from '@/utils/teamDetailsUtils/teamSeoUtils';

const makeTeam = (overrides: Partial<Team> = {}): Team =>
  ({
    id: 'team-1',
    name: 'Bag Boys',
    divisionName: 'East',
    wins: 7,
    losses: 3,
    players: ['Alex', 'Sam'],
    logoUrl: 'https://cdn.example.com/logo.png',
    imageUrl: 'https://cdn.example.com/team.png',
    ...overrides,
  }) as Team;

describe('toPercent', () => {
  it('scales a fraction', () => {
    expect(toPercent(0.75)).toBe(75);
  });

  it.each([[undefined], [null], [0], [Number.NaN]])('treats %s as zero', (value) => {
    expect(toPercent(value as number | null | undefined)).toBe(0);
  });
});

describe('toTeamCanonicalPath', () => {
  it('builds the readable address from the team name', () => {
    expect(toTeamCanonicalPath('Bag Boys')).toBe('/teams/bag-boys');
  });

  it('strips the punctuation a url cannot carry', () => {
    expect(toTeamCanonicalPath("Baggin' & Braggin'")).toBe('/teams/baggin-braggin');
  });
});

describe('buildTeamSeo', () => {
  it('builds the canonical url from the page path', () => {
    expect(buildTeamSeo(makeTeam(), '/teams/bag-boys').url).toBe(
      'https://717rec.app/teams/bag-boys'
    );
  });

  it('describes a team by division and record', () => {
    expect(buildTeamSeo(makeTeam(), '/teams/bag-boys').description).toBe(
      'Bag Boys — 717REC cornhole team, East division, 7-3 record. Roster, stats, and match history.'
    );
  });

  it('leaves the division out of the description when there is none', () => {
    expect(buildTeamSeo(makeTeam({ divisionName: null }), '/teams/x').description).toBe(
      'Bag Boys — 717REC cornhole team, 7-3 record. Roster, stats, and match history.'
    );
  });

  it('reads a missing record as 0-0', () => {
    expect(
      buildTeamSeo(makeTeam({ wins: undefined, losses: undefined }), '/teams/x').description
    ).toContain('0-0 record');
  });

  describe('structured data', () => {
    it('names the team, its sport and its league', () => {
      expect(buildTeamSeo(makeTeam(), '/teams/bag-boys').jsonLd).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'SportsTeam',
        name: 'Bag Boys',
        sport: 'Cornhole',
        url: 'https://717rec.app/teams/bag-boys',
        memberOf: [
          { '@type': 'SportsOrganization', name: '717REC', url: 'https://717rec.app/' },
          { '@type': 'SportsOrganization', name: 'East' },
        ],
        athlete: [
          { '@type': 'Person', name: 'Alex' },
          { '@type': 'Person', name: 'Sam' },
        ],
      });
    });

    it('prefers the logo over the team image', () => {
      expect(buildTeamSeo(makeTeam(), '/teams/x').jsonLd.logo).toBe(
        'https://cdn.example.com/logo.png'
      );
    });

    it('falls back to the image when the logo is not an absolute url', () => {
      // Schema.org needs an absolute URL, so an upload path is no use.
      const team = makeTeam({ logoUrl: '/uploads/logo.png' });
      expect(buildTeamSeo(team, '/teams/x').jsonLd.logo).toBe('https://cdn.example.com/team.png');
    });

    it.each([
      ['neither is absolute', { logoUrl: '/uploads/a.png', imageUrl: '/uploads/b.png' }],
      ['both are missing', { logoUrl: null, imageUrl: null }],
    ])('omits logo entirely when %s', (_label, overrides) => {
      const { jsonLd } = buildTeamSeo(makeTeam(overrides as Partial<Team>), '/teams/x');
      expect(jsonLd).not.toHaveProperty('logo');
    });

    it('omits roster when there is none', () => {
      const { jsonLd } = buildTeamSeo(makeTeam({ players: [] }), '/teams/x');
      expect(jsonLd).not.toHaveProperty('athlete');
    });

    // The division is a second organisation the team belongs to, not a child of
    // it, so with no division the list holds the league alone.
    it('lists only the league when the team has no division', () => {
      const { jsonLd } = buildTeamSeo(makeTeam({ divisionName: null }), '/teams/x');
      expect(jsonLd.memberOf).toEqual([
        { '@type': 'SportsOrganization', name: '717REC', url: 'https://717rec.app/' },
      ]);
      expect(jsonLd).not.toHaveProperty('subOrganization');
    });
  });
});
