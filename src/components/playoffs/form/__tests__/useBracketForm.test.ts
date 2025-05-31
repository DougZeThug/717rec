
import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBracketForm } from '../useBracketForm';
import { Team } from '@/types';
import { UseFormReturn } from 'react-hook-form';
import { BracketFormValues } from '../BracketFormSchema';

// Mock the useBracketFormState hook
vi.mock('../hooks/useBracketFormState', () => ({
  useBracketFormState: vi.fn()
}));

import { useBracketFormState } from '../hooks/useBracketFormState';

// Create properly typed mock
const mockUseBracketFormState = vi.mocked(useBracketFormState);

describe('useBracketForm', () => {
  const mockTeams: Team[] = [
    { id: 'team1', name: 'Team 1', division_id: 'div1' },
    { id: 'team2', name: 'Team 2', division_id: 'div1' },
    { id: 'team3', name: 'Team 3', division_id: 'div2' },
  ];
  
  const mockOnSubmit = vi.fn();
  
  // Create a complete UseFormReturn mock
  const createMockForm = (): UseFormReturn<BracketFormValues> => ({
    watch: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(() => ({
      title: "",
      divisionId: "",
      format: "Single Elimination" as const,
      teams: [],
    })),
    reset: vi.fn(),
    handleSubmit: vi.fn(),
    control: {} as any,
    register: vi.fn(),
    unregister: vi.fn(),
    formState: {
      errors: {},
      isDirty: false,
      isValid: false,
      isSubmitting: false,
      isLoading: false,
      isSubmitted: false,
      isSubmitSuccessful: false,
      isValidating: false,
      submitCount: 0,
      touchedFields: {},
      dirtyFields: {},
      validatingFields: {},
      defaultValues: {}
    },
    getFieldState: vi.fn(),
    setError: vi.fn(),
    clearErrors: vi.fn(),
    trigger: vi.fn(),
    resetField: vi.fn(),
    setFocus: vi.fn()
  });

  const mockFormState = {
    form: createMockForm(),
    isFormValid: false,
    validateForm: vi.fn(),
    handleSubmit: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementation with proper typing
    mockUseBracketFormState.mockReturnValue(mockFormState);
    mockFormState.form.watch.mockReturnValue({
      title: "",
      divisionId: "",
      format: "Single Elimination" as const,
      teams: [],
    });
  });

  it('should initialize correctly with form state', () => {
    const { result } = renderHook(() => 
      useBracketForm({ teams: mockTeams, onSubmit: mockOnSubmit })
    );
    
    expect(result.current.form).toBe(mockFormState.form);
    expect(result.current.isFormValid).toBe(false);
    expect(result.current.handleSubmit).toBe(mockFormState.handleSubmit);
  });

  it('should call useBracketFormState with correct parameters', () => {
    renderHook(() => 
      useBracketForm({ teams: mockTeams, onSubmit: mockOnSubmit })
    );
    
    expect(mockUseBracketFormState).toHaveBeenCalledWith({ onSubmit: mockOnSubmit });
  });

  it('should watch form values for validation', () => {
    renderHook(() => 
      useBracketForm({ teams: mockTeams, onSubmit: mockOnSubmit })
    );
    
    expect(mockFormState.form.watch).toHaveBeenCalled();
  });

  it('should call validateForm when watched values change', () => {
    const newFormValues = {
      title: "Test Tournament",
      divisionId: "div1",
      format: "Single Elimination" as const,
      teams: ["team1", "team2"],
    };
    
    mockFormState.form.watch.mockReturnValue(newFormValues);
    
    renderHook(() => 
      useBracketForm({ teams: mockTeams, onSubmit: mockOnSubmit })
    );
    
    expect(mockFormState.validateForm).toHaveBeenCalledWith(newFormValues);
  });

  it('should return correct form validation state', () => {
    const validFormState = {
      ...mockFormState,
      isFormValid: true
    };
    
    mockUseBracketFormState.mockReturnValue(validFormState);
    
    const { result } = renderHook(() => 
      useBracketForm({ teams: mockTeams, onSubmit: mockOnSubmit })
    );
    
    expect(result.current.isFormValid).toBe(true);
  });

  it('should handle form submission correctly', () => {
    const { result } = renderHook(() => 
      useBracketForm({ teams: mockTeams, onSubmit: mockOnSubmit })
    );
    
    expect(result.current.handleSubmit).toBe(mockFormState.handleSubmit);
  });

  it('should re-validate when form values change', () => {
    const { rerender } = renderHook(() => 
      useBracketForm({ teams: mockTeams, onSubmit: mockOnSubmit })
    );
    
    // Change watched values
    const updatedValues = {
      title: "Updated Title",
      divisionId: "div2",
      format: "Double Elimination" as const,
      teams: ["team3"],
    };
    
    mockFormState.form.watch.mockReturnValue(updatedValues);
    
    rerender();
    
    expect(mockFormState.validateForm).toHaveBeenCalledWith(updatedValues);
  });
});
