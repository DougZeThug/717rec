import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DivisionsTab from '../DivisionsTab';

const mockUseDivisions = vi.fn();
vi.mock('@/hooks/useDivisions', () => ({ useDivisions: () => mockUseDivisions() }));

vi.mock('../DivisionRow', () => ({
  default: ({ division, layout }: { division: { name: string }; layout: string }) =>
    layout === 'row' ? (
      <tr>
        <td>{`row-${division.name}`}</td>
      </tr>
    ) : (
      <div>{`card-${division.name}`}</div>
    ),
}));

let dialogOpen: boolean | undefined;
vi.mock('../CreateDivisionDialog', () => ({
  default: ({ open }: { open: boolean }) => {
    dialogOpen = open;
    return <div data-testid="create-dialog" data-open={String(open)} />;
  },
}));

describe('DivisionsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dialogOpen = undefined;
  });

  it('renders a row and a card per division', () => {
    mockUseDivisions.mockReturnValue({
      divisions: [
        { id: 'd1', name: 'Comp', division_weight: 1, display_division: 'Competitive' },
        { id: 'd2', name: 'Rec', division_weight: 0.8, display_division: 'Recreational' },
      ],
      isLoading: false,
    });
    render(<DivisionsTab />);
    expect(screen.getByText('row-Comp')).toBeInTheDocument();
    expect(screen.getByText('card-Comp')).toBeInTheDocument();
    expect(screen.getByText('row-Rec')).toBeInTheDocument();
  });

  it('shows the empty state when no divisions exist', () => {
    mockUseDivisions.mockReturnValue({ divisions: [], isLoading: false });
    render(<DivisionsTab />);
    expect(screen.getByText(/no divisions yet/i)).toBeInTheDocument();
  });

  it('shows the loading state', () => {
    mockUseDivisions.mockReturnValue({ divisions: [], isLoading: true });
    render(<DivisionsTab />);
    expect(screen.getByText(/loading divisions/i)).toBeInTheDocument();
  });

  it('opens the create dialog from the New Division button', async () => {
    mockUseDivisions.mockReturnValue({ divisions: [], isLoading: false });
    const user = userEvent.setup();
    render(<DivisionsTab />);
    expect(dialogOpen).toBe(false);
    await user.click(screen.getByRole('button', { name: /new division/i }));
    expect(dialogOpen).toBe(true);
  });
});
