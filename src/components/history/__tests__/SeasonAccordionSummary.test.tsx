import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import SeasonAccordionSummary from '../SeasonAccordionSummary';
import type { SeasonData } from '../useSeasonAccordionViewModel';

vi.mock('@/components/shared/TeamLogo', () => ({
  TeamLogo: ({ teamName }: { teamName: string }) => <span>{teamName} logo</span>,
}));

const row = (overrides: Partial<SeasonData> = {}): SeasonData => ({
  team_id: 't1',
  season_id: 's1',
  match_wins: 9,
  match_losses: 1,
  game_wins: 19,
  game_losses: 5,
  sos: 0.55,
  power_score: 0.9,
  champion: true,
  runner_up: false,
  division_name: 'Competitive',
  playoff_rank: 1,
  team_name: 'Bag Bandits',
  team_logo_url: null,
  team_image_url: null,
  ...overrides,
});

const renderSummary = (championTeams: SeasonData[], isWinterTheme = false) =>
  render(
    <SeasonAccordionSummary
      isLoading={false}
      seasonData={[row()]}
      championTeams={championTeams}
      highlights={null}
      isWinterTheme={isWinterTheme}
    />,
    { wrapper: MemoryRouter }
  );

describe('SeasonAccordionSummary champions card', () => {
  it('links each champion name to its team page', () => {
    renderSummary([
      row(),
      row({ team_id: 't2', team_name: "Baggin' & Braggin'", division_name: 'Recreational' }),
    ]);

    expect(screen.getByRole('link', { name: 'Bag Bandits' })).toHaveAttribute(
      'href',
      '/teams/bag-bandits'
    );
    expect(screen.getByRole('link', { name: "Baggin' & Braggin'" })).toHaveAttribute(
      'href',
      '/teams/baggin-braggin'
    );
  });

  it('keeps "Unknown Team" as plain text', () => {
    renderSummary([row({ team_name: 'Unknown Team' })]);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Unknown Team')).toBeInTheDocument();
  });

  it('uses the small tap area here, because the rows are only 6px apart', () => {
    renderSummary([row()]);

    const link = screen.getByRole('link', { name: 'Bag Bandits' });
    expect(link).not.toHaveClass('hit-area-44');
    expect(link).toHaveClass('py-1.5', '-my-1.5');
  });

  it('keeps the record and the division line under the name, outside the link', () => {
    renderSummary([row()]);

    expect(screen.getByText(/9-1/)).toHaveTextContent('9-1 · Competitive');
    expect(screen.getByRole('link', { name: 'Bag Bandits' })).not.toHaveTextContent('9-1');
  });

  it('keeps the name look: small, bold, clamped to two lines, white in the winter theme', () => {
    const { unmount } = renderSummary([row()]);
    const light = screen.getByText('Bag Bandits');
    expect(light).toHaveClass('line-clamp-2', 'break-words');
    expect(light.parentElement?.parentElement).toHaveClass(
      'text-xs',
      'font-semibold',
      'text-foreground'
    );
    unmount();

    renderSummary([row()], true);
    expect(screen.getByText('Bag Bandits').parentElement?.parentElement).toHaveClass('text-white');
  });

  it('says there is no champion when the season has none', () => {
    renderSummary([]);

    expect(screen.getByText('No champion')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('SeasonAccordionSummary highlights card', () => {
  const renderHighlights = (name: string) =>
    render(
      <SeasonAccordionSummary
        isLoading={false}
        seasonData={[row()]}
        championTeams={[]}
        highlights={{
          mostWins: row({ team_name: name, match_wins: 9 }),
          highestPS: row({ team_name: name, power_score: 0.882 }),
          mostGameWins: row({ team_name: name, game_wins: 19 }),
        }}
        isWinterTheme={false}
      />,
      { wrapper: MemoryRouter }
    );

  it('shows each name with its number after it', () => {
    renderHighlights('Bag Bandits');

    expect(screen.getAllByText('Bag Bandits')).toHaveLength(3);
    expect(screen.getByText('(9)')).toBeInTheDocument();
    expect(screen.getByText('(88.2)')).toBeInTheDocument();
    expect(screen.getByText('(19)')).toBeInTheDocument();
  });

  // jsdom does no layout, so this pins the classes. The name and the number were one clamped line
  // of text: a name that filled both lines pushed the number into the cut part.
  it('clamps only the name, so a long name never hides the number', () => {
    renderHighlights('Fake Team Golf Supercalifragilistic Roster With A Very Long Name');

    const name = screen.getAllByText(/Supercalifragilistic/)[0];
    expect(name).toHaveClass('line-clamp-2', 'break-words', 'min-w-0');
    const number = screen.getByText('(9)');
    expect(number).toHaveClass('shrink-0');
    expect(number).not.toHaveClass('line-clamp-2');
    expect(number.parentElement).toBe(name.parentElement);
  });
});
