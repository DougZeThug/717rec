import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

import ScoreSection from '../ScoreSection';

const teams: Team[] = [
  { id: 't1', name: 'Alpha' },
  { id: 't2', name: 'Bravo' },
];

const baseProps = {
  isCompleted: true,
  team1Id: 't1',
  team2Id: 't2',
  team1Score: undefined as number | undefined,
  team2Score: undefined as number | undefined,
  setTeam1Score: vi.fn(),
  setTeam2Score: vi.fn(),
  teams,
};

describe('ScoreSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when the match is not completed', () => {
    const { container } = render(<ScoreSection {...baseProps} isCompleted={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels both score inputs with the resolved team names when completed', () => {
    render(<ScoreSection {...baseProps} />);
    expect(screen.getByLabelText('Alpha Score')).toBeInTheDocument();
    expect(screen.getByLabelText('Bravo Score')).toBeInTheDocument();
  });

  it('falls back to generic labels when a team id does not resolve', () => {
    render(<ScoreSection {...baseProps} team1Id="missing-1" team2Id="missing-2" />);
    expect(screen.getByLabelText('Team 1 Score')).toBeInTheDocument();
    expect(screen.getByLabelText('Team 2 Score')).toBeInTheDocument();
  });

  it('calls setTeam1Score with the parsed integer when a number is typed', () => {
    const setTeam1Score = vi.fn();
    render(<ScoreSection {...baseProps} setTeam1Score={setTeam1Score} />);

    fireEvent.change(screen.getByLabelText('Alpha Score'), { target: { value: '5' } });

    expect(setTeam1Score).toHaveBeenCalledWith(5);
  });

  it('calls setTeam1Score with undefined when the input is cleared', () => {
    const setTeam1Score = vi.fn();
    render(<ScoreSection {...baseProps} team1Score={5} setTeam1Score={setTeam1Score} />);

    fireEvent.change(screen.getByLabelText('Alpha Score'), { target: { value: '' } });

    expect(setTeam1Score).toHaveBeenCalledWith(undefined);
  });
});
