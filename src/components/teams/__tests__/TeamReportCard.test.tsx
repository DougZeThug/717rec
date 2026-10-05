import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GradeCategory, TeamGrades } from '@/utils/reportCardUtils';

import TeamReportCard from '../TeamReportCard';

const mockUseTeamReportCard = vi.hoisted(() => vi.fn());
const mockRetry = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useTeamReportCard', () => ({
  useTeamReportCard: (teamId: string, mode: string) => mockUseTeamReportCard(teamId, mode),
}));
// The leaderboard has its own hooks and its own tests.
vi.mock('../ReportCardLeaderboard', () => ({ default: () => null }));
vi.mock('@/utils/charts/chartStyleUtils', () => ({
  useChartColors: () => ({
    background: '#ffffff',
    gridColor: '#e5e7eb',
    textColor: '#334155',
    mutedTextColor: '#64748b',
  }),
}));

/** jsdom has no layout, so the responsive box would collapse to nothing. */
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <actual.ResponsiveContainer width={400} height={260}>
        {children as React.ReactElement}
      </actual.ResponsiveContainer>
    ),
  };
});

const category = (label: string, grade: GradeCategory['grade'], percentile: number | null) =>
  ({ label, grade, percentile, description: `${label} description` }) as GradeCategory;

const grades = (gpa: number): TeamGrades => ({
  overall: category('Overall', 'A', 90),
  offense: category('Offense', 'B', 75),
  clutch: category('Clutch', 'C', 55),
  schedule: category('Schedule', 'B', 70),
  consistency: category('Consistency', 'A', 92),
  games: category('Games', 'B', 72),
  gpa,
});

const state = (overrides: Record<string, unknown> = {}) => ({
  grades: grades(3.6),
  isLoading: false,
  error: null,
  retry: mockRetry,
  ...overrides,
});

describe('TeamReportCard', () => {
  beforeEach(() => {
    mockUseTeamReportCard.mockReturnValue(state());
  });

  it('shows grey placeholders for the radar and six grade cards while loading', () => {
    mockUseTeamReportCard.mockReturnValue(state({ grades: null, isLoading: true }));
    const { container } = render(<TeamReportCard teamId="t1" standalone />);

    expect(container.querySelectorAll('.bg-muted.overflow-hidden').length).toBeGreaterThanOrEqual(
      7
    );
    expect(screen.queryByText('GPA')).not.toBeInTheDocument();
  });

  it('says the request failed, and retries on demand, instead of claiming there is no data', () => {
    mockUseTeamReportCard.mockReturnValue(state({ grades: null, error: new Error('boom') }));
    render(<TeamReportCard teamId="t1" standalone />);

    expect(screen.getByText(/couldn't load the report card/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('says there is not enough data for a team with no grades yet', () => {
    mockUseTeamReportCard.mockReturnValue(state({ grades: null }));
    render(<TeamReportCard teamId="t1" standalone />);

    expect(screen.getByText(/not enough data to generate a report card/i)).toBeInTheDocument();
  });

  it.each([
    [3.6, 'text-emerald-600'],
    [3.2, 'text-blue-600'],
    [2.5, 'text-amber-600'],
    [1.5, 'text-orange-600'],
    [0.5, 'text-red-600'],
  ])('colours a %s GPA with %s', (gpa, colour) => {
    mockUseTeamReportCard.mockReturnValue(state({ grades: grades(gpa) }));
    render(<TeamReportCard teamId="t1" standalone />);

    expect(screen.getByText(gpa.toFixed(2))).toHaveClass(colour);
  });

  it('shows a dash and "Not available", not a letter, for a grade that cannot be measured yet', () => {
    mockUseTeamReportCard.mockReturnValue(
      state({
        grades: { ...grades(3.6), clutch: category('Clutch', null, null) },
      })
    );
    render(<TeamReportCard teamId="t1" standalone />);

    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.getByText('Not enough data yet')).toBeInTheDocument();
  });

  it('lists all six grades as text', () => {
    render(<TeamReportCard teamId="t1" standalone />);

    // The radar repeats each label for the eye, so look for the card text.
    for (const label of ['Overall', 'Offense', 'Clutch', 'Schedule', 'Consistency', 'Games']) {
      expect(screen.getByText(`${label} description`)).toBeInTheDocument();
    }
  });

  it('switches to the career report card when Career is chosen', () => {
    render(<TeamReportCard teamId="t1" standalone />);

    fireEvent.click(screen.getByRole('radio', { name: 'Career' }));

    expect(mockUseTeamReportCard).toHaveBeenCalledWith('t1', 'career');
  });

  it('puts the card in a collapsible section headed with the overall grade when not standalone', () => {
    render(
      <MemoryRouter>
        <TeamReportCard teamId="t1" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /report card/i })).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
