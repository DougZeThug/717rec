import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PlayerList from '../PlayerList';

const renderList = (players: string[]) =>
  render(
    <MemoryRouter>
      <PlayerList players={players} />
    </MemoryRouter>
  );

afterEach(() => vi.restoreAllMocks());

describe('PlayerList', () => {
  it('shows a Roster section that is open, with one chip per player', () => {
    renderList(['Ann Ray', 'Bo Chen']);

    expect(screen.getByRole('button', { name: 'Roster' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Ann Ray')).toBeInTheDocument();
    expect(screen.getByText('Bo Chen')).toBeInTheDocument();
    expect(screen.queryByText('No players registered')).not.toBeInTheDocument();
  });

  it('says no players are registered when the roster is empty', () => {
    renderList([]);

    expect(screen.getByText('No players registered')).toBeInTheDocument();
    expect(screen.getByText('Player information will appear once added')).toBeInTheDocument();
  });

  it('lets a chip grow to 160px, wider than the 80px default', () => {
    renderList(['Alexandria Montgomery-Smith']);

    const chip = screen.getByText('Alexandria Montgomery-Smith').parentElement;
    expect(chip).toHaveClass('[&>span]:max-w-40');
  });

  it('shows every player when two players share a name', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderList(['Sam Lee', 'Ann Ray', 'Sam Lee', 'Sam Lee']);

    expect(screen.getAllByText('Sam Lee')).toHaveLength(3);
    expect(screen.getAllByText('Ann Ray')).toHaveLength(1);
    // React reports repeated keys with "Encountered two children with the same key".
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps the same chips on screen when an unrelated player is added in front', () => {
    const { rerender } = renderList(['Sam Lee', 'Sam Lee']);
    const [firstSam, secondSam] = screen.getAllByText('Sam Lee');

    rerender(
      <MemoryRouter>
        <PlayerList players={['Zed Poe', 'Sam Lee', 'Sam Lee']} />
      </MemoryRouter>
    );

    // The two Sam chips are the same page elements, not new ones.
    const [newFirstSam, newSecondSam] = screen.getAllByText('Sam Lee');
    expect(newFirstSam).toBe(firstSam);
    expect(newSecondSam).toBe(secondSam);
    expect(screen.getByText('Zed Poe')).toBeInTheDocument();
  });
});
