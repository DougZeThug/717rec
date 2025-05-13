
import { renderHook, act } from '@testing-library/react-hooks';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBracketForm } from '../useBracketForm';
import { Team } from '@/types';

describe('useBracketForm', () => {
  const mockTeams: Team[] = [
    { id: 'team1', name: 'Team 1', division_id: 'div1' },
    { id: 'team2', name: 'Team 2', division_id: 'div1' },
    { id: 'team3', name: 'Team 3', division_id: 'div2' },
  ];
  
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty filtered teams', () => {
    const { result } = renderHook(() => useBracketForm({ 
      teams: mockTeams, 
      onSubmit: mockOnSubmit 
    }));
    
    expect(result.current.filteredTeams).toEqual([]);
    expect(result.current.selectedDivision).toBe("");
  });

  it('filters teams when division changes', () => {
    const { result } = renderHook(() => useBracketForm({ 
      teams: mockTeams, 
      onSubmit: mockOnSubmit 
    }));
    
    act(() => {
      result.current.handleDivisionChange('div1');
    });
    
    expect(result.current.selectedDivision).toBe('div1');
    expect(result.current.filteredTeams.length).toBe(2);
    expect(result.current.filteredTeams[0].id).toBe('team1');
    expect(result.current.filteredTeams[1].id).toBe('team2');
  });

  it('initializes form with default values', () => {
    const { result } = renderHook(() => useBracketForm({ 
      teams: mockTeams, 
      onSubmit: mockOnSubmit 
    }));
    
    expect(result.current.form.getValues()).toEqual({
      title: "",
      divisionId: "",
      format: "Double Elimination",
      teams: [],
      useChallonge: true,
    });
  });

  it('handles division change and updates form values', () => {
    const { result } = renderHook(() => useBracketForm({ 
      teams: mockTeams, 
      onSubmit: mockOnSubmit 
    }));
    
    const setValueSpy = vi.spyOn(result.current.form, 'setValue');
    
    act(() => {
      result.current.handleDivisionChange('div2');
    });
    
    expect(result.current.selectedDivision).toBe('div2');
    expect(setValueSpy).toHaveBeenCalledWith('divisionId', 'div2');
    expect(setValueSpy).toHaveBeenCalledWith('teams', []);
  });

  it('groups teams by division correctly', () => {
    const { result } = renderHook(() => useBracketForm({ 
      teams: mockTeams, 
      onSubmit: mockOnSubmit 
    }));
    
    expect(Object.keys(result.current.teamsByDivision).length).toBe(2);
    expect(result.current.teamsByDivision['div1'].length).toBe(2);
    expect(result.current.teamsByDivision['div2'].length).toBe(1);
  });
});
