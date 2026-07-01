import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PredictionBreakdown, PredictionResult } from '@/utils/predictions';

import { MatchPrediction } from '../MatchPrediction';

// A fully-populated breakdown so formatBreakdown (which runs for real) emits
// every segment: Season, Career, Win% and H2H.
const breakdown: PredictionBreakdown = {
  powerScoreA: 100,
  powerScoreB: 80,
  sosA: 0.5,
  sosB: 0.5,
  divisionWeightA: 1,
  divisionWeightB: 1,
  careerPowerA: 110,
  careerPowerB: 90,
  careerSosA: 0.5,
  careerSosB: 0.5,
  careerWinPctA: 0.6,
  careerWinPctB: 0.4,
  h2hWinsA: 3,
  h2hWinsB: 1,
  h2hTotalMatches: 4,
  h2hRatingA: 0.75,
  h2hRatingB: 0.25,
  h2hDominanceFactor: 0.5,
  hasH2HData: true,
  seasonRatingA: 0.6,
  seasonRatingB: 0.4,
  careerRatingA: 0.6,
  careerRatingB: 0.4,
  teamRatingA: 0.6,
  teamRatingB: 0.4,
  ratingDiff: 0.2,
  hasCareerDataA: true,
  hasCareerDataB: true,
};

const prediction: PredictionResult = {
  probA: 0.65,
  probB: 0.35,
  expectedText: 'Sharks favored',
  confidence: 'High',
  breakdown,
};

const renderComponent = (overrides: Partial<PredictionResult> = {}) =>
  render(
    <MatchPrediction
      prediction={{ ...prediction, ...overrides }}
      team1Name="Sharks"
      team2Name="Jets"
    />
  );

describe('MatchPrediction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both probability labels, the expected text and the confidence badge', () => {
    renderComponent();

    // probA 0.65 -> 65% / 35%
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('Sharks favored')).toBeInTheDocument();
    // ConfidenceBadge renders the level text.
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('hides the breakdown until the toggle is clicked', () => {
    renderComponent();

    // Collapsed by default: neither the formatBreakdown output nor the
    // heuristic footnote should be present.
    expect(screen.queryByText(/Season: 100 vs 80/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Heuristic model/)).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', {
      name: 'Toggle prediction details for Sharks vs Jets',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands and collapses the breakdown when the toggle is clicked', () => {
    renderComponent();

    const toggle = screen.getByRole('button', {
      name: 'Toggle prediction details for Sharks vs Jets',
    });

    // Expand
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(/Season: 100 vs 80 · Career: 110 vs 90 · Win%: 60% vs 40% · H2H: 3-1/)
    ).toBeInTheDocument();
    expect(
      screen.getByText('Heuristic model: 65% Career + 25% Season + 10% Head-to-Head')
    ).toBeInTheDocument();

    // Collapse again
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Season: 100 vs 80/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Heuristic model/)).not.toBeInTheDocument();
  });
});
