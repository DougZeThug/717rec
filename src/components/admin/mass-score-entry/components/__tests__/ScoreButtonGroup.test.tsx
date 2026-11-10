import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ScoreButtonGroup from '../ScoreButtonGroup';

describe('ScoreButtonGroup', () => {
  it('offers the four results and reports the one pressed', async () => {
    const onChange = vi.fn();
    render(
      <ScoreButtonGroup
        value={null}
        onChange={onChange}
        team1Name="Corn Stars"
        team2Name="Bag Boys"
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: /2–0/u }));

    // All four fields: a wrong match score or a wrong game score must both fail here.
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      team1Score: 1,
      team2Score: 0,
      team1GameWins: 2,
      team2GameWins: 0,
    });
  });

  it('reports the other three results with their own match and game scores', async () => {
    const onChange = vi.fn();
    render(<ScoreButtonGroup value={null} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /2–1/u }));
    await userEvent.click(screen.getByRole('button', { name: /1–2/u }));
    await userEvent.click(screen.getByRole('button', { name: /0–2/u }));

    expect(onChange.mock.calls.map(([payload]) => payload)).toEqual([
      { team1Score: 1, team2Score: 0, team1GameWins: 2, team2GameWins: 1 },
      { team1Score: 0, team2Score: 1, team1GameWins: 1, team2GameWins: 2 },
      { team1Score: 0, team2Score: 1, team1GameWins: 0, team2GameWins: 2 },
    ]);
  });

  // jsdom does no layout, so this pins the classes. On a 320px phone the four buttons in one row
  // were 38.5px wide; they reach 44px at 342px, so under that they go two by two.
  it('goes two by two under 342px wide so every button is at least 44px wide', () => {
    render(<ScoreButtonGroup value={null} onChange={vi.fn()} />);

    const grid = screen.getAllByRole('button')[0].parentElement;
    expect(grid).toHaveClass('grid-cols-4', 'max-[342px]:grid-cols-2');
  });

  // The team names over the buttons tell the admin which side each result favours. At 11px
  // (text-2xs) they were too small to read; text-xs is 12px with the same 1rem line height.
  it('shows the team names over the buttons at 12px', () => {
    render(
      <ScoreButtonGroup
        value={null}
        onChange={vi.fn()}
        team1Name="Corn Stars"
        team2Name="Bag Boys"
      />
    );

    const names = screen.getByText(/Corn Stars/).parentElement;
    expect(names).toHaveClass('text-xs');
    expect(names).not.toHaveClass('text-2xs');
  });
});
