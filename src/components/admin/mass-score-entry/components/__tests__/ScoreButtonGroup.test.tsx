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
    await userEvent.click(screen.getByRole('button', { name: /2–0/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatchObject({ team1GameWins: 2, team2GameWins: 0 });
  });

  // jsdom does no layout, so this pins the classes. On a 320px phone the four buttons in one row
  // were 38.5px wide; they reach 44px at 342px, so under that they go two by two.
  it('goes two by two under 342px wide so every button is at least 44px wide', () => {
    render(<ScoreButtonGroup value={null} onChange={vi.fn()} />);

    const grid = screen.getAllByRole('button')[0].parentElement;
    expect(grid).toHaveClass('grid-cols-4', 'max-[342px]:grid-cols-2');
  });
});
