import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeamReportCard } from '@/hooks/useTeamReportCard';

const mockUseTeamRankings = vi.fn();
const mockUseTeamMatches = vi.fn();
const mockUseCareerRankings = vi.fn();

const mockCalculatePercentile = vi.fn();
const mockCalculateGrade = vi.fn();
const mockCalculateGPA = vi.fn();
const mockCalculateClutchRecord = vi.fn();
const mockCalculateSweepRate = vi.fn();

vi.mock('@/hooks/useTeamRankings', () => ({
  useTeamRankings: () => mockUseTeamRankings(),
}));

vi.mock('@/hooks/useTeamMatches', () => ({
  useTeamMatches: (teamId: string | undefined) => mockUseTeamMatches(teamId),
}));

vi.mock('@/hooks/useCareerRankings', () => ({
  useCareerRankings: () => mockUseCareerRankings(),
}));

vi.mock('@/utils/percentileUtils', () => ({
  calculatePercentile: (...args: unknown[]) => mockCalculatePercentile(...args),
}));

vi.mock('@/utils/reportCardUtils', () => ({
  calculateGrade: (percentile: number) => mockCalculateGrade(percentile),
  calculateGPA: (weightedGrades: unknown[]) => mockCalculateGPA(weightedGrades),
}));

vi.mock('@/utils/teamDetailsUtils/matchOutcomeUtils', () => ({
  calculateClutchRecord: (teamId: string, matches: unknown[]) =>
    mockCalculateClutchRecord(teamId, matches),
}));

vi.mock('@/utils/teamDetailsUtils/sweepRateUtils', () => ({
  calculateSweepRate: (teamId: string, matches: unknown[]) => mockCalculateSweepRate(teamId, matches),
}));

describe('useTeamReportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseTeamRankings.mockReturnValue({ rankings: [], isLoading: false });
    mockUseTeamMatches.mockReturnValue({ pastMatches: [], isLoading: false });
    mockUseCareerRankings.mockReturnValue({ data: [], isLoading: false });

    mockCalculatePercentile.mockReturnValue({ percentile: 80 });
    mockCalculateGrade.mockImplementation((percentile: number) => `grade-${percentile}`);
    mockCalculateGPA.mockReturnValue(3.8);
    mockCalculateClutchRecord.mockReturnValue({ clutchWinPct: 67.2, game3Matches: 3 });
    mockCalculateSweepRate.mockReturnValue({ sweepRate: 40 });
  });

  it('returns null grades when teamId is undefined', () => {
    const { result } = renderHook(() => useTeamReportCard(undefined, 'season'));

    expect(result.current.grades).toBeNull();
  });

  it('returns null in season mode when rankings are missing', () => {
    mockUseTeamRankings.mockReturnValue({ rankings: null, isLoading: false });

    const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));

    expect(result.current.grades).toBeNull();
  });

  it('computes all season categories and GPA when ranking exists', () => {
    const rankings = [
      {
        teamId: 'team-1',
        powerScore: 95,
        winPercentage: 0.8,
        sos: 0.7,
        gameWinPercentage: 0.75,
        wins: 10,
        losses: 2,
      },
      {
        teamId: 'team-2',
        powerScore: 90,
        winPercentage: 0.7,
        sos: 0.6,
        gameWinPercentage: 0.65,
        wins: 8,
        losses: 4,
      },
    ];

    mockUseTeamRankings.mockReturnValue({ rankings, isLoading: false });
    mockUseTeamMatches.mockReturnValue({ pastMatches: [{ id: 'm1' }], isLoading: false });
    mockCalculateSweepRate.mockReturnValue({ sweepRate: 55 });
    mockCalculateClutchRecord.mockReturnValue({ clutchWinPct: 66.7, game3Matches: 3 });
    mockCalculatePercentile
      .mockReturnValueOnce({ percentile: 91 }) // overall
      .mockReturnValueOnce({ percentile: 77 }) // offense
      .mockReturnValueOnce({ percentile: 70 }) // schedule
      .mockReturnValueOnce({ percentile: 88 }) // consistency
      .mockReturnValueOnce({ percentile: 84 }); // games
    mockCalculateGPA.mockReturnValue(3.9);

    const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));

    expect(result.current.grades).toEqual({
      overall: {
        label: 'Overall',
        grade: 'grade-91',
        percentile: 91,
        description: 'Combined power score ranking',
      },
      offense: {
        label: 'Offense',
        grade: 'grade-77',
        percentile: 77,
        description: 'Dominance in matches (sweep rate)',
      },
      clutch: {
        label: 'Clutch',
        grade: 'grade-67',
        percentile: 67,
        description: 'Performance in close matches (game 3)',
      },
      schedule: {
        label: 'Schedule',
        grade: 'grade-70',
        percentile: 70,
        description: 'Strength of opponents faced',
      },
      consistency: {
        label: 'Consistency',
        grade: 'grade-88',
        percentile: 88,
        description: 'Win rate reliability',
      },
      games: {
        label: 'Games',
        grade: 'grade-84',
        percentile: 84,
        description: 'Individual game win rate',
      },
      gpa: 3.9,
    });
    expect(mockCalculateGPA).toHaveBeenCalledTimes(1);
  });

  it('uses clutch fallback percentile 50 in season mode when no game3 sample', () => {
    const rankings = [
      {
        teamId: 'team-1',
        powerScore: 95,
        winPercentage: 0.8,
        sos: 0.7,
        gameWinPercentage: 0.75,
        wins: 10,
        losses: 2,
      },
    ];
    mockUseTeamRankings.mockReturnValue({ rankings, isLoading: false });
    mockCalculateClutchRecord.mockReturnValue({ clutchWinPct: 99, game3Matches: 0 });

    const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));

    expect(result.current.grades?.clutch.percentile).toBe(50);
    expect(result.current.grades?.clutch.grade).toBe('grade-50');
  });

  it('returns null in career mode when dataset is empty', () => {
    mockUseCareerRankings.mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useTeamReportCard('team-1', 'career'));

    expect(result.current.grades).toBeNull();
  });

  it('returns null in career mode when team is missing from dataset', () => {
    mockUseCareerRankings.mockReturnValue({
      data: [
        {
          teamId: 'team-2',
          careerPowerScore: 100,
          careerWinPercentage: 0.8,
          careerSos: 0.6,
          careerSweepRate: 0.4,
          careerGameWinPercentage: 0.7,
          careerClutchWinPct: 65,
          careerClutchGame3s: 12,
        },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useTeamReportCard('team-1', 'career'));

    expect(result.current.grades).toBeNull();
  });

  it('computes all career categories and GPA for a valid team', () => {
    const data = [
      {
        teamId: 'team-1',
        careerPowerScore: 120,
        careerWinPercentage: 0.83,
        careerSos: 0.72,
        careerSweepRate: 0.58,
        careerGameWinPercentage: 0.79,
        careerClutchWinPct: 74,
        careerClutchGame3s: 18,
      },
      {
        teamId: 'team-2',
        careerPowerScore: 110,
        careerWinPercentage: 0.75,
        careerSos: 0.68,
        careerSweepRate: 0.52,
        careerGameWinPercentage: 0.71,
        careerClutchWinPct: 66,
        careerClutchGame3s: 14,
      },
    ];

    mockUseCareerRankings.mockReturnValue({ data, isLoading: false });
    mockCalculatePercentile
      .mockReturnValueOnce({ percentile: 93 }) // overall
      .mockReturnValueOnce({ percentile: 89 }) // offense
      .mockReturnValueOnce({ percentile: 82 }) // schedule
      .mockReturnValueOnce({ percentile: 85 }) // consistency
      .mockReturnValueOnce({ percentile: 80 }); // games
    mockCalculateGPA.mockReturnValue(4.0);

    const { result } = renderHook(() => useTeamReportCard('team-1', 'career'));

    expect(result.current.grades).toEqual({
      overall: {
        label: 'Overall',
        grade: 'grade-93',
        percentile: 93,
        description: 'Career power score ranking',
      },
      offense: {
        label: 'Offense',
        grade: 'grade-89',
        percentile: 89,
        description: 'Career sweep rate',
      },
      clutch: {
        label: 'Clutch',
        grade: 'grade-74',
        percentile: 74,
        description: 'Career game 3 win rate',
      },
      schedule: {
        label: 'Schedule',
        grade: 'grade-82',
        percentile: 82,
        description: 'Career strength of schedule',
      },
      consistency: {
        label: 'Consistency',
        grade: 'grade-85',
        percentile: 85,
        description: 'Career win rate',
      },
      games: {
        label: 'Games',
        grade: 'grade-80',
        percentile: 80,
        description: 'Career game win rate',
      },
      gpa: 4.0,
    });
    expect(mockCalculateGPA).toHaveBeenCalledTimes(1);
  });

  it('uses clutch fallback percentile 50 in career mode when no game3 sample', () => {
    mockUseCareerRankings.mockReturnValue({
      data: [
        {
          teamId: 'team-1',
          careerPowerScore: 120,
          careerWinPercentage: 0.83,
          careerSos: 0.72,
          careerSweepRate: 0.58,
          careerGameWinPercentage: 0.79,
          careerClutchWinPct: 99,
          careerClutchGame3s: 0,
        },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useTeamReportCard('team-1', 'career'));

    expect(result.current.grades?.clutch.percentile).toBe(50);
    expect(result.current.grades?.clutch.grade).toBe('grade-50');
  });

  it('uses season combined loading state in season mode', () => {
    mockUseTeamRankings.mockReturnValue({ rankings: [], isLoading: true });
    mockUseTeamMatches.mockReturnValue({ pastMatches: [], isLoading: false });
    mockUseCareerRankings.mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));

    expect(result.current.isLoading).toBe(true);
  });

  it('uses career loading state in career mode', () => {
    mockUseTeamRankings.mockReturnValue({ rankings: [], isLoading: true });
    mockUseTeamMatches.mockReturnValue({ pastMatches: [], isLoading: true });
    mockUseCareerRankings.mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useTeamReportCard('team-1', 'career'));

    expect(result.current.isLoading).toBe(false);
  });
});
