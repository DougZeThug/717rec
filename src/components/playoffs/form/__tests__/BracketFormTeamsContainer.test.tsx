
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BracketFormTeamsContainer } from '../bracket-teams/components/BracketFormTeamsContainer';

// Mock the hooks
vi.mock('../bracket-teams/hooks', () => ({
  useBracketFormData: vi.fn(),
  useBracketFormState: vi.fn()
}));

vi.mock('@/hooks/playoffs', () => ({
  useFilteredTeams: vi.fn(),
  useTeamSeeding: vi.fn()
}));

// Mock the child components
vi.mock('../bracket-teams/components', () => ({
  TeamSelectionError: ({ errorMessage, minTeams, maxTeams }: any) => (
    <div data-testid="team-selection-error">
      <span>{errorMessage}</span>
      <span>Min: {minTeams}, Max: {maxTeams}</span>
    </div>
  ),
  TeamSelectionLoading: ({ minTeams, maxTeams }: any) => (
    <div data-testid="team-selection-loading">
      Min: {minTeams}, Max: {maxTeams}
    </div>
  ),
  TeamSelectionEmpty: ({ message, minTeams, maxTeams }: any) => (
    <div data-testid="team-selection-empty">
      <span>{message}</span>
      <span>Min: {minTeams}, Max: {maxTeams}</span>
    </div>
  ),
  TeamSelectionForm: ({ statusMessage, seededTeams, onTeamToggle }: any) => (
    <div data-testid="team-selection-form">
      <span>{statusMessage}</span>
      <span>Teams: {seededTeams ? seededTeams.length : 0}</span>
      <button onClick={() => onTeamToggle('team-1')}>Toggle Team</button>
    </div>
  )
}));

// Mock imports
const mockUseBracketFormData = vi.hoisted(() => vi.fn());
const mockUseBracketFormState = vi.hoisted(() => vi.fn());
const mockUseFilteredTeams = vi.hoisted(() => vi.fn());
const mockUseTeamSeeding = vi.hoisted(() => vi.fn());

vi.mock('../bracket-teams/hooks', () => ({
  useBracketFormData: mockUseBracketFormData,
  useBracketFormState: mockUseBracketFormState
}));

vi.mock('@/hooks/playoffs', () => ({
  useFilteredTeams: mockUseFilteredTeams,
  useTeamSeeding: mockUseTeamSeeding
}));

describe('BracketFormTeamsContainer', () => {
  const defaultProps = {
    divisionId: 'div-1',
    maxTeams: 16,
    onChange: vi.fn(),
    divisions: [
      { id: 'div-1', name: 'Division A' }
    ]
  };

  const mockProcessedTeams = [
    {
      id: 'team-1',
      name: 'Team Alpha',
      seed: 1,
      division_id: 'div-1',
      divisionName: 'Division A',
      wins: 8,
      losses: 2,
      game_wins: 24,
      game_losses: 6,
      imageUrl: null,
      logoUrl: null,
      players: [],
      power_score: 95.5,
      sos: 0.65,
      win_percentage: 0.8,
      game_win_percentage: 0.8,
      created_at: new Date().toISOString(),
      close_match_losses: 0
    }
  ];

  const mockTeams = [
    {
      id: 'team-1',
      name: 'Team Alpha',
      seed: 1,
      division_id: 'div-1',
      divisionName: 'Division A',
      wins: 8,
      losses: 2,
      game_wins: 24,
      game_losses: 6,
      imageUrl: null,
      logoUrl: null,
      players: [],
      power_score: 95.5,
      sos: 0.65,
      win_percentage: 0.8,
      game_win_percentage: 0.8,
      created_at: new Date().toISOString(),
      close_match_losses: 0
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseBracketFormData.mockReturnValue({
      teams: mockProcessedTeams,
      isLoading: false,
      isError: false,
      errorMessage: null,
      isDataReady: true
    });
    
    mockUseBracketFormState.mockReturnValue({
      selected: new Set(['team-1']),
      count: 1,
      handleTeamToggle: vi.fn(),
      statusMessage: 'Selected 1 of 16 maximum teams'
    });
    
    mockUseFilteredTeams.mockReturnValue(mockTeams);
    mockUseTeamSeeding.mockReturnValue(mockTeams);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Error States', () => {
    it('renders error state when data failed to load', () => {
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: false,
        isError: true,
        errorMessage: 'Failed to load teams',
        isDataReady: false
      });

      render(<BracketFormTeamsContainer {...defaultProps} />);
      
      expect(screen.getByTestId('team-selection-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load teams')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('renders loading state when data is loading', () => {
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: true,
        isError: false,
        errorMessage: null,
        isDataReady: false
      });

      render(<BracketFormTeamsContainer {...defaultProps} />);
      
      expect(screen.getByTestId('team-selection-loading')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('renders empty state when no teams in division', () => {
      mockUseFilteredTeams.mockReturnValue([]);

      render(<BracketFormTeamsContainer {...defaultProps} />);
      
      expect(screen.getByTestId('team-selection-empty')).toBeInTheDocument();
      expect(screen.getByText('No teams available in this division')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('renders team selection form when data is ready', () => {
      render(<BracketFormTeamsContainer {...defaultProps} />);
      
      expect(screen.getByTestId('team-selection-form')).toBeInTheDocument();
      expect(screen.getByText('Selected 1 of 16 maximum teams')).toBeInTheDocument();
      expect(screen.getByText('Teams: 1')).toBeInTheDocument();
    });

    it('handles team toggle interactions', async () => {
      const mockToggle = vi.fn();
      
      mockUseBracketFormState.mockReturnValue({
        selected: new Set(['team-1']),
        count: 1,
        handleTeamToggle: mockToggle,
        statusMessage: 'Selected 1 of 16 maximum teams'
      });

      render(<BracketFormTeamsContainer {...defaultProps} />);
      
      const toggleButton = screen.getByText('Toggle Team');
      await userEvent.click(toggleButton);
      
      expect(mockToggle).toHaveBeenCalledWith('team-1');
    });
  });

  describe('Props and Configuration', () => {
    it('uses custom minTeams prop', () => {
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: true,
        isError: false,
        errorMessage: null,
        isDataReady: false
      });

      render(<BracketFormTeamsContainer {...defaultProps} minTeams={4} />);
      
      expect(screen.getByText('Min: 4, Max: 16')).toBeInTheDocument();
    });

    it('defaults minTeams to 2 when not provided', () => {
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: true,
        isError: false,
        errorMessage: null,
        isDataReady: false
      });

      render(<BracketFormTeamsContainer {...defaultProps} />);
      
      expect(screen.getByText('Min: 2, Max: 16')).toBeInTheDocument();
    });
  });
});
