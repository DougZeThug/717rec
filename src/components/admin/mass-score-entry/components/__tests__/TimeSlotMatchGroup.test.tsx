import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TimeSlotMatchGroup from '../TimeSlotMatchGroup';

describe('admin TimeSlotMatchGroup', () => {
  it('shows the time slot and how many matches it holds', () => {
    render(
      <TimeSlotMatchGroup
        timeSlot="7:00 PM"
        matches={[]}
        onScoreChange={vi.fn()}
        onGameWinsChange={vi.fn()}
        onMarkCompleted={vi.fn()}
      />
    );

    expect(screen.getByText('7:00 PM')).toBeInTheDocument();
    expect(screen.getByText('0 matches')).toBeInTheDocument();
  });

  // jsdom does no layout, so this checks the classes. From 768px the admin sidebar takes 240px.
  // Two columns from 768px (`md`) left the four result buttons 29-35px wide, and "2–0" broke onto
  // two lines (768-810px). Two columns must wait until 840px, where each button is 38px or wider.
  it('uses one column until 840px wide so the result buttons keep room for "2–0"', () => {
    const { container } = render(
      <TimeSlotMatchGroup
        timeSlot="7:00 PM"
        matches={[]}
        defaultOpen
        onScoreChange={vi.fn()}
        onGameWinsChange={vi.fn()}
        onMarkCompleted={vi.fn()}
      />
    );

    const grid = container.querySelector('.grid');
    expect(grid).not.toBeNull();
    expect(grid).toHaveClass('grid-cols-1', 'min-[840px]:grid-cols-2');
    expect(grid).not.toHaveClass('md:grid-cols-2');
  });
});
