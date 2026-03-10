import { renderHook } from '@testing-library/react';
import { UseFormReturn, UseFormWatch } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BracketFormValues } from '../BracketFormSchema';
import { useBracketForm } from '../useBracketForm';

// Mock the useBracketFormState hook
vi.mock('../hooks/useBracketFormState', () => ({
  useBracketFormState: vi.fn(),
}));

import { useBracketFormState } from '../hooks/useBracketFormState';

// Create properly typed mock
const mockUseBracketFormState = vi.mocked(useBracketFormState);

// Define proper interfaces for mock data
interface MockFormState {
  errors: Record<string, any>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  isLoading: boolean;
  isSubmitted: boolean;
  isSubmitSuccessful: boolean;
  isValidating: boolean;
  isReady: boolean;
  submitCount: number;
  touchedFields: Record<string, any>;
  dirtyFields: Record<string, any>;
  validatingFields: Record<string, any>;
  defaultValues?: any;
  disabled: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface MockBracketFormState {
  form: UseFormReturn<any>;
  isFormValid: boolean;
  validateForm: (data: unknown) => ValidationResult;
  handleSubmit: () => Promise<void>;
}

describe('useBracketForm', () => {
  const mockOnSubmit = vi.fn();

  // Create a complete UseFormReturn mock with proper React Hook Form patterns
  const createMockForm = (): UseFormReturn<any> => {
    // Create a proper mock watch function that matches UseFormWatch signature
    const mockWatch = vi.fn() as unknown as UseFormWatch<BracketFormValues>;

    // Setup watch implementation with proper overloads
    (mockWatch as any).mockImplementation((nameOrCallback?: any, defaultValue?: any) => {
      // Handle callback pattern: watch((values, { name, type }) => ...)
      if (typeof nameOrCallback === 'function') {
        // Return unsubscribe function for callback-based watching
        return () => {};
      }

      // Handle field name pattern: watch('fieldName') or watch()
      const defaultFormValues: BracketFormValues = {
        title: '',
        divisionId: '',
        format: 'Single Elimination' as const,
        teams: [],
        grandFinalType: 'simple' as const,
      };

      if (nameOrCallback === undefined) {
        // watch() without parameters returns current form values
        return defaultFormValues;
      }

      // watch(fieldName) returns specific field value
      return defaultFormValues[nameOrCallback as keyof BracketFormValues];
    });

    const mockGetValues = vi.fn();

    // Setup getValues to handle different call patterns
    mockGetValues.mockImplementation((fieldName?: keyof BracketFormValues) => {
      if (fieldName === undefined) {
        // getValues() without parameters returns all values
        return {
          title: '',
          divisionId: '',
          format: 'Single Elimination' as const,
          teams: [],
        };
      }
      // getValues(fieldName) returns specific field value
      const formValues: BracketFormValues = {
        title: '',
        divisionId: '',
        format: 'Single Elimination' as const,
        teams: [],
        grandFinalType: 'simple' as const,
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
      isReady: true,
      submitCount: 0,
      touchedFields: {},
      dirtyFields: {},
      validatingFields: {},
      defaultValues: {},
      disabled: false,
    };

    return {
      watch: mockWatch,
      setValue: vi.fn(),
      getValues: mockGetValues,
      reset: vi.fn(),
      handleSubmit: vi.fn(),
      control: {} as UseFormReturn<any>['control'],
      register: vi.fn(),
      unregister: vi.fn(),
      formState: mockFormState,
      getFieldState: vi.fn(),
      setError: vi.fn(),
      clearErrors: vi.fn(),
      trigger: vi.fn(),
      resetField: vi.fn(),
      setFocus: vi.fn(),
      subscribe: vi.fn(),
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
      handleSubmit: vi.fn(),
    };

    // Setup default mock implementation
    mockUseBracketFormState.mockReturnValue(mockFormState);
  });

  it('should initialize correctly with form state', () => {
    const { result } = renderHook(() => useBracketForm({ onSubmit: mockOnSubmit }));

    expect(result.current.form).toBe(mockFormState.form);
    expect(result.current.isFormValid).toBe(false);
    expect(result.current.handleSubmit).toBe(mockFormState.handleSubmit);
  });

  it('should call useBracketFormState with correct parameters', () => {
    renderHook(() => useBracketForm({ onSubmit: mockOnSubmit }));

    expect(mockUseBracketFormState).toHaveBeenCalledWith({ onSubmit: mockOnSubmit });
  });

  it('should watch form values for validation', () => {
    renderHook(() => useBracketForm({ onSubmit: mockOnSubmit }));

    expect(mockForm.watch).toHaveBeenCalled();
  });

  it('should call validateForm when watched values change', () => {
    const newFormValues: BracketFormValues = {
      title: 'Test Tournament',
      divisionId: 'div1',
      format: 'Single Elimination' as const,
      teams: ['team1', 'team2'],
      grandFinalType: 'simple' as const,
    };

    // Update the mock to return new values using proper mock implementation
    const mockWatch = mockForm.watch as any;
    mockWatch.mockImplementation((nameOrCallback?: any) => {
      if (typeof nameOrCallback === 'function') {
        return () => {};
      }
      if (nameOrCallback === undefined) {
        return newFormValues;
      }
      return newFormValues[nameOrCallback as keyof BracketFormValues];
    });

    renderHook(() => useBracketForm({ onSubmit: mockOnSubmit }));

    expect(mockFormState.validateForm).toHaveBeenCalledWith(newFormValues);
  });

  it('should return correct form validation state', () => {
    const validFormState: MockBracketFormState = {
      ...mockFormState,
      isFormValid: true,
    };

    mockUseBracketFormState.mockReturnValue(validFormState);

    const { result } = renderHook(() => useBracketForm({ onSubmit: mockOnSubmit }));

    expect(result.current.isFormValid).toBe(true);
  });

  it('should handle form submission correctly', () => {
    const { result } = renderHook(() => useBracketForm({ onSubmit: mockOnSubmit }));

    expect(result.current.handleSubmit).toBe(mockFormState.handleSubmit);
  });

  it('should re-validate when form values change', () => {
    const { rerender } = renderHook(() => useBracketForm({ onSubmit: mockOnSubmit }));

    // Change watched values by updating the mock implementation
    const updatedValues: BracketFormValues = {
      title: 'Updated Title',
      divisionId: 'div2',
      format: 'Double Elimination' as const,
      teams: ['team3'],
      grandFinalType: 'double' as const,
    };

    const mockWatch = mockForm.watch as any;
    mockWatch.mockImplementation((nameOrCallback?: any) => {
      if (typeof nameOrCallback === 'function') {
        return () => {};
      }
      if (nameOrCallback === undefined) {
        return updatedValues;
      }
      return updatedValues[nameOrCallback as keyof BracketFormValues];
    });

    rerender();

    expect(mockFormState.validateForm).toHaveBeenCalledWith(updatedValues);
  });
});
