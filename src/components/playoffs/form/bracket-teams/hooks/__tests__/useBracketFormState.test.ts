
import { renderHook, act } from '@testing-library/react';
import { useBracketFormState } from '../useBracketFormState';

// Mock the dependent hooks
jest.mock('../useTeamSelectionState', () => ({
  useTeamSelectionState: jest.fn()
}));

jest.mock('../useFormValidation', () => ({
  useFormValidation: jest.fn()
}));

jest.mock('../useTeamSelectionEffects', () => ({
  useTeamSelectionEffects: jest.fn()
}));

import { useTeamSelectionState } from '../useTeamSelectionState';
import { useFormValidation } from '../useFormValidation';
import { useTeamSelectionEffects } from '../useTeamSelectionEffects';

describe('useBracketFormState', () => {
  const mockUseTeamSelectionState = useTeamSelectionState as jest.MockedFunction<typeof useTeamSelectionState>;
  const mockUseFormValidation = useFormValidation as jest.MockedFunction<typeof useFormValidation>;
  const mockUseTeamSelectionEffects = useTeamSelectionEffects as jest.MockedFunction<typeof useTeamSelectionEffects>;

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should combine all hook results correctly', () => {
    const mockSelected = new Set(['team-1', 'team-2']);
    const mockSelectedArray = ['team-1', 'team-2'];
    const mockToggle = jest.fn();

    mockUseTeamSelectionState.mockReturnValue({
      selected: mockSelected,
      selectedArray: mockSelectedArray,
      count: 2,
      toggle: mockToggle,
      setSelected: jest.fn(),
      clearSelection: jest.fn(),
      canSelectMore: true,
      isAtMaximum: false,
      hasSelection: true
    });

    mockUseFormValidation.mockReturnValue({
      isValid: true,
      isComplete: true,
      hasError: false,
      hasWarning: false,
      errorMessage: null,
      warningMessage: null,
      statusMessage: '2 teams selected',
      progress: {
        percentage: 100,
        selected: 2,
        required: 2,
        maximum: 16,
        available: 10
      }
    });

    mockUseTeamSelectionEffects.mockReturnValue({
      cleanup: jest.fn()
    });

    const { result } = renderHook(() => 
      useBracketFormState(16, mockOnChange, 10, 2)
    );

    expect(result.current.selected).toBe(mockSelected);
    expect(result.current.selectedArray).toBe(mockSelectedArray);
    expect(result.current.count).toBe(2);
    expect(result.current.canSelectMore).toBe(true);
    expect(result.current.isValid).toBe(true);
    expect(result.current.statusMessage).toBe('2 teams selected');
  });

  it('should handle team toggle correctly', () => {
    const mockToggle = jest.fn();

    mockUseTeamSelectionState.mockReturnValue({
      selected: new Set(),
      selectedArray: [],
      count: 0,
      toggle: mockToggle,
      setSelected: jest.fn(),
      clearSelection: jest.fn(),
      canSelectMore: true,
      isAtMaximum: false,
      hasSelection: false
    });

    mockUseFormValidation.mockReturnValue({
      isValid: false,
      isComplete: false,
      hasError: true,
      hasWarning: false,
      errorMessage: 'Please select teams to continue',
      warningMessage: null,
      statusMessage: 'Select 2 more teams',
      progress: {
        percentage: 0,
        selected: 0,
        required: 2,
        maximum: 16,
        available: 10
      }
    });

    mockUseTeamSelectionEffects.mockReturnValue({
      cleanup: jest.fn()
    });

    const { result } = renderHook(() => 
      useBracketFormState(16, mockOnChange, 10, 2)
    );

    act(() => {
      result.current.handleTeamToggle('team-1');
    });

    expect(mockToggle).toHaveBeenCalledWith('team-1');
  });

  it('should pass correct parameters to validation hook', () => {
    mockUseTeamSelectionState.mockReturnValue({
      selected: new Set(['team-1']),
      selectedArray: ['team-1'],
      count: 1,
      toggle: jest.fn(),
      setSelected: jest.fn(),
      clearSelection: jest.fn(),
      canSelectMore: true,
      isAtMaximum: false,
      hasSelection: true
    });

    mockUseFormValidation.mockReturnValue({
      isValid: false,
      isComplete: false,
      hasError: false,
      hasWarning: true,
      errorMessage: null,
      warningMessage: 'Need at least 2 teams (currently 1 selected)',
      statusMessage: 'Select 1 more team',
      progress: {
        percentage: 50,
        selected: 1,
        required: 2,
        maximum: 16,
        available: 10
      }
    });

    mockUseTeamSelectionEffects.mockReturnValue({
      cleanup: jest.fn()
    });

    renderHook(() => 
      useBracketFormState(16, mockOnChange, 10, 2)
    );

    expect(mockUseFormValidation).toHaveBeenCalledWith(1, 16, 2, 10);
  });

  it('should pass selected array to effects hook', () => {
    const mockSelectedArray = ['team-1', 'team-2'];

    mockUseTeamSelectionState.mockReturnValue({
      selected: new Set(mockSelectedArray),
      selectedArray: mockSelectedArray,
      count: 2,
      toggle: jest.fn(),
      setSelected: jest.fn(),
      clearSelection: jest.fn(),
      canSelectMore: true,
      isAtMaximum: false,
      hasSelection: true
    });

    mockUseFormValidation.mockReturnValue({
      isValid: true,
      isComplete: true,
      hasError: false,
      hasWarning: false,
      errorMessage: null,
      warningMessage: null,
      statusMessage: '2 teams selected',
      progress: {
        percentage: 100,
        selected: 2,
        required: 2,
        maximum: 16,
        available: 10
      }
    });

    mockUseTeamSelectionEffects.mockReturnValue({
      cleanup: jest.fn()
    });

    renderHook(() => 
      useBracketFormState(16, mockOnChange, 10, 2)
    );

    expect(mockUseTeamSelectionEffects).toHaveBeenCalledWith(mockSelectedArray, mockOnChange);
  });

  it('should memoize team toggle handler', () => {
    const mockToggle = jest.fn();

    mockUseTeamSelectionState.mockReturnValue({
      selected: new Set(),
      selectedArray: [],
      count: 0,
      toggle: mockToggle,
      setSelected: jest.fn(),
      clearSelection: jest.fn(),
      canSelectMore: true,
      isAtMaximum: false,
      hasSelection: false
    });

    mockUseFormValidation.mockReturnValue({
      isValid: false,
      isComplete: false,
      hasError: true,
      hasWarning: false,
      errorMessage: 'Please select teams to continue',
      warningMessage: null,
      statusMessage: 'Select 2 more teams',
      progress: {
        percentage: 0,
        selected: 0,
        required: 2,
        maximum: 16,
        available: 10
      }
    });

    mockUseTeamSelectionEffects.mockReturnValue({
      cleanup: jest.fn()
    });

    const { result, rerender } = renderHook(() => 
      useBracketFormState(16, mockOnChange, 10, 2)
    );

    const firstHandler = result.current.handleTeamToggle;

    rerender();

    expect(result.current.handleTeamToggle).toBe(firstHandler);
  });
});
