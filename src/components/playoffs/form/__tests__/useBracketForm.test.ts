
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

// Define proper interfaces for mock data
interface MockFormState {
  errors: Record<string, unknown>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  isLoading: boolean;
  isSubmitted: boolean;
  isSubmitSuccessful: boolean;
  isValidating: boolean;
  submitCount: number;
  touchedFields: Record<string, unknown>;
  dirtyFields: Record<string, unknown>;
  validatingFields: Record<string, unknown>;
  defaultValues?: Partial<BracketFormValues>;
  disabled: boolean;
}

interface MockBracketFormState {
  form: UseFormReturn<BracketFormValues>;
  isFormValid: boolean;
  validateForm: ReturnType<typeof vi.fn>;
  handleSubmit: ReturnType<typeof vi.fn>;
}

describe('useBracketForm', () => {
  const mockTeams: Team[] = [
    { id: 'team1', name: 'Team 1', division_id: 'div1' },
    { id: 'team2', name: 'Team 2', division_id: 'div1' },
    { id: 'team3', name: 'Team 3', division_id: 'div2' },
  ];
  
  const mockOnSubmit = vi.fn();
  
  // Create a complete UseFormReturn mock with proper React Hook Form patterns
  const createMockForm = (): UseFormReturn<BracketFormValues> => {
    const mockWatch = vi.fn();
    const mockGetValues = vi.fn();
    
    // Setup watch to handle different call patterns
    mockWatch.mockImplementation((fieldName?: keyof BracketFormValues) => {
      if (fieldName === undefined) {
        // watch() without parameters returns current form values
        return {
          title: "",
          divisionId: "",
          format: "Single Elimination" as const,
          teams: [],
        };
      }
      // watch(fieldName) returns specific field value
      const formValues: BracketFormValues = {
        title: "",
        divisionId: "",
        format: "Single Elimination" as const,
        teams: [],
      };
      return formValues[fieldName];
    });

    // Setup getValues to handle different call patterns
    mockGetValues.mockImplementation((fieldName?: keyof BracketFormValues) => {
      if (fieldName === undefined) {
        // getValues() without parameters returns all values
        return {
          title: "",
          divisionId: "",
          format: "Single Elimination" as const,
          teams: [],
        };
      }
      // getValues(fieldName) returns specific field value
      const formValues: BracketFormValues = {
        title: "",
        divisionId: "",
        format: "Single Elimination" as const,
        teams: [],
      };
      return formValues[fieldName];
    });

    const mockFormState: MockFormState = {
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
      defaultValues: {},
      disabled: false
    };
    
    return {
      watch: mockWatch,
      setValue: vi.fn(),
      getValues: mockGetValues,
      reset: vi.fn(),
      handleSubmit: vi.fn(),
      control: {} as UseFormReturn<BracketFormValues>['control'],
      register: vi.fn(),
      unregister: vi.fn(),
      formState: mockFormState,
      getFieldState: vi.fn(),
      setError: vi.fn(),
      clearErrors: vi.fn(),
      trigger: vi.fn(),
      resetField: vi.fn(),
      setFocus: vi.fn()
    };
  };

  let mockForm: UseFormReturn<BracketFormValues>;
  let mockFormState: MockBracketFormState;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create fresh mock form
    mockForm = createMockForm();
    
    // Setup mock form state
    mockFormState = {
      form: mockForm,
      isFormValid: false,
      validateForm: vi.fn(),
      handleSubmit: vi.fn()
    };
    
    // Setup default mock implementation
    mockUseBracketFormState.mockReturnValue(mockFormState);
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
    
    expect(mockForm.watch).toHaveBeenCalled();
  });

  it('should call validateForm when watched values change', () => {
    const newFormValues: BracketFormValues = {
      title: "Test Tournament",
      divisionId: "div1",
      format: "Single Elimination" as const,
      teams: ["team1", "team2"],
    };
    
    // Update the mock to return new values
    vi.mocked(mockForm.watch).mockImplementation((fieldName?: keyof BracketFormValues) => {
      if (fieldName === undefined) {
        return newFormValues;
      }
      return newFormValues[fieldName];
    });
    
    renderHook(() => 
      useBracketForm({ teams: mockTeams, onSubmit: mockOnSubmit })
    );
    
    expect(mockFormState.validateForm).toHaveBeenCalledWith(newFormValues);
  });

  it('should return correct form validation state', () => {
    const validFormState: MockBracketFormState = {
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
    
    // Change watched values by updating the mock implementation
    const updatedValues: BracketFormValues = {
      title: "Updated Title",
      divisionId: "div2",
      format: "Double Elimination" as const,
      teams: ["team3"],
    };
    
    vi.mocked(mockForm.watch).mockImplementation((fieldName?: keyof BracketFormValues) => {
      if (fieldName === undefined) {
        return updatedValues;
      }
      return updatedValues[fieldName];
    });
    
    rerender();
    
    expect(mockFormState.validateForm).toHaveBeenCalledWith(updatedValues);
  });
});
