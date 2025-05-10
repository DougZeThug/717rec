
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { TimeBlockTeamsList } from '../../auto-schedule/TimeBlockTeamsList';
import { mockTeams } from '@/utils/test/autoSchedule/mockData';

describe('TimeBlockTeamsList', () => {
  it('should render a message when no teams are available', () => {
    render(<TimeBlockTeamsList teams={[]} />);
    
    expect(screen.getByText('No teams assigned to this block')).toBeInTheDocument();
  });

  it('should render teams when they are provided', () => {
    render(<TimeBlockTeamsList teams={mockTeams} />);
    
    // Should display each team name
    expect(screen.getByText('Tigers')).toBeInTheDocument();
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.getByText('Eagles')).toBeInTheDocument();
    expect(screen.getByText('Bears')).toBeInTheDocument();
    
    // Should render team logos
    const teamLogos = screen.getAllByRole('img');
    expect(teamLogos).toHaveLength(4);
  });

  it('should handle teams with missing properties', () => {
    const incompleteTeam = [{ 
      id: 'team5', 
      name: 'Incomplete Team',
      // Missing other properties
    }] as any;
    
    // Should render without errors
    render(<TimeBlockTeamsList teams={incompleteTeam} />);
    
    expect(screen.getByText('Incomplete Team')).toBeInTheDocument();
  });
});
