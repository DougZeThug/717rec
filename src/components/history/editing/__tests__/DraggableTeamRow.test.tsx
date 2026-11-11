import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { EditableTeam } from '../../hooks/useHistoryEditing';
import DraggableTeamRow from '../DraggableTeamRow';

const baseTeam: EditableTeam = {
  team_id: 'team-1',
  season_id: 'season-1',
  team_name: 'Bag Slingers',
  team_logo_url: null,
  team_image_url: null,
  division_name: 'Competitive',
  playoff_rank: 3,
  match_wins: 6,
  match_losses: 2,
  game_wins: 14,
  game_losses: 6,
  sos: 0.5,
  power_score: 70,
  champion: false,
  runner_up: false,
};

const renderRow = (team: Partial<EditableTeam> = {}, rank = 3) => {
  const full = { ...baseTeam, ...team };
  return render(
    <DndContext>
      <SortableContext items={[full.team_id]}>
        <DraggableTeamRow team={full} rank={rank} />
      </SortableContext>
    </DndContext>
  );
};

/** The rank badge is the element right after the drag handle. */
const rankBadge = () => screen.getByLabelText('Drag to reorder').nextElementSibling as HTMLElement;

describe('DraggableTeamRow', () => {
  it('shows the rank, team name and record for a plain team', () => {
    renderRow();

    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('Bag Slingers')).toBeInTheDocument();
    // 6 wins of 8 matches is 75%.
    expect(screen.getByText('(75%)')).toBeInTheDocument();
    expect(rankBadge()).toHaveClass('bg-primary/10', 'text-primary-text');
  });

  it('gives the drag handle an accessible name', () => {
    renderRow();

    const handle = screen.getByLabelText('Drag to reorder');
    // dnd-kit makes the handle a focusable button for keyboard drags.
    expect(handle).toHaveAttribute('role', 'button');
    expect(handle).toHaveAttribute('tabindex', '0');
  });

  it('marks the champion with a yellow badge in place of the rank', () => {
    renderRow({ champion: true });

    expect(screen.queryByText('#3')).not.toBeInTheDocument();
    expect(rankBadge()).toHaveClass('bg-yellow-500/20', 'text-yellow-600');
  });

  it('marks the runner-up with a muted badge in place of the rank', () => {
    renderRow({ runner_up: true });

    expect(screen.queryByText('#3')).not.toBeInTheDocument();
    expect(rankBadge()).toHaveClass('bg-gray-500/20', 'text-muted-foreground');
  });

  it('shows the team logo when the team has one', () => {
    renderRow({ team_logo_url: 'https://example.test/logo.png' });

    expect(screen.getByAltText('Bag Slingers logo')).toHaveAttribute(
      'src',
      'https://example.test/logo.png'
    );
  });

  it('prefers the team photo over the logo', () => {
    renderRow({
      team_logo_url: 'https://example.test/logo.png',
      team_image_url: 'https://example.test/photo.png',
    });

    expect(screen.getByAltText('Bag Slingers logo')).toHaveAttribute(
      'src',
      'https://example.test/photo.png'
    );
  });

  it('hides a logo that fails to load', () => {
    renderRow({ team_logo_url: 'https://example.test/broken.png' });

    const logo = screen.getByAltText('Bag Slingers logo');
    fireEvent.error(logo);

    expect(logo).toHaveStyle({ display: 'none' });
    // The team name stays in the row.
    expect(screen.getByText('Bag Slingers')).toBeInTheDocument();
  });

  it('shows 0% for a team with no matches', () => {
    renderRow({ match_wins: 0, match_losses: 0 });

    expect(screen.getByText('(0%)')).toBeInTheDocument();
  });
});
