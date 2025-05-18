
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayoffMatchCard from '../PlayoffMatchCard';

// Mock the child components to simplify testing
jest.mock('../MatchCardHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="match-card-header">Match Header</div>
}));

jest.mock('../MatchTeamsSection', () => ({
  __esModule: true,
  default: () => <div data-testid="match-teams-section">Teams Section</div>
}));

jest.mock('../MatchStatusIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="match-status">Match Status</div>
}));

jest.mock('../MatchGamesDots', () => ({
  __esModule: true,
  default: () => <div data-testid="match-games-dots">Games Dots</div>
}));

jest.mock('../ChampionIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="champion-indicator">Champion</div>
}));

describe('PlayoffMatchCard', () => {
  const mockMatch = {
    id: 'match-1',
    round: 1,
    position: 1,
    team1Id: 'team-1',
    team2Id: 'team-2',
    winnerId: 'team-1',
    team1Score: 2,
    team2Score: 1,
    team1GameWins: 2,
    team2GameWins: 1,
    matchType: 'winners',
    bestOf: 3,
    team1Seed: 1,
    team2Seed: 2,
    nextWinMatchId: 'match-3',
    nextLoseMatchId: null,
    bracket_id: 'bracket-1',
    games: [
      { id: 'game-1', team1Score: 21, team2Score: 19, winner: 'team1Id' },
      { id: 'game-2', team1Score: 19, team2Score: 21, winner: 'team2Id' },
      { id: 'game-3', team1Score: 21, team2Score: 15, winner: 'team1Id' }
    ]
  };
  
  const mockTeams = [
    { id: 'team-1', name: 'Team 1', seed: 1 },
    { id: 'team-2', name: 'Team 2', seed: 2 }
  ];
  
  it('renders the match card with all sections', () => {
    render(<PlayoffMatchCard 
      match={mockMatch}
      teams={mockTeams}
      hasNextMatch={true}
    />);
    
    expect(screen.getByTestId('match-card-header')).toBeInTheDocument();
    expect(screen.getByTestId('match-teams-section')).toBeInTheDocument();
    expect(screen.getByTestId('match-status')).toBeInTheDocument();
    expect(screen.getByTestId('match-games-dots')).toBeInTheDocument();
  });
  
  it('calls onEditMatch when clicked', () => {
    const mockOnEditMatch = jest.fn();
    
    render(<PlayoffMatchCard 
      match={mockMatch}
      teams={mockTeams}
      onEditMatch={mockOnEditMatch}
      hasNextMatch={true}
    />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    expect(mockOnEditMatch).toHaveBeenCalledWith('match-1');
  });
  
  it('supports keyboard navigation', () => {
    const mockOnEditMatch = jest.fn();
    
    render(<PlayoffMatchCard 
      match={mockMatch}
      teams={mockTeams}
      onEditMatch={mockOnEditMatch}
      hasNextMatch={true}
    />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    
    expect(mockOnEditMatch).toHaveBeenCalledWith('match-1');
  });
});
