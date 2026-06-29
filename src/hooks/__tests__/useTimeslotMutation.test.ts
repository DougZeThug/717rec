import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ByeWeekService } from '@/services/timeslots/ByeWeekService';
import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotValidator } from '@/services/timeslots/TimeslotValidator';
import type { TeamTimeslot } from '@/types/timeslots';

import { useTimeslotMutation } from '../useTimeslotMutation';

const invalidateQueries = vi.fn();
const toast = vi.fn();

type ValidationResult = { valid: boolean; error?: string };

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value?: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve as (value?: T) => void, reject };
};

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock('@/services/timeslots/TimeslotService', () => ({
  TimeslotService: {
    addTimeslot: vi.fn(),
    deleteTimeslot: vi.fn(),
    batchAssignTimeslots: vi.fn(),
    batchAssignDoubleHeaders: vi.fn(),
  },
}));

vi.mock('@/services/timeslots/ByeWeekService', () => ({
  ByeWeekService: {
    assignByeWeek: vi.fn(),
    batchAssignByeWeeks: vi.fn(),
    removeByeWeek: vi.fn(),
  },
}));

vi.mock('@/services/timeslots/TimeslotValidator', () => ({
  TimeslotValidator: {
    validateTimeslotAssignment: vi.fn(),
    validateBatchAssignment: vi.fn(),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast }),
}));

const TEST_DATE = new Date('2026-03-14T00:00:00.000Z');
const FORMATTED_DATE = '2026-03-14';

const sampleSlot = (id: string): TeamTimeslot => ({
  id,
  match_date: FORMATTED_DATE,
  timeslot: '18:00',
  team_id: 'team-1',
  created_at: '2026-01-01T00:00:00.000Z',
  is_back_to_back: false,
  is_double_header: false,
  pair_slot: null,
  match_sequence: null,
});

describe('useTimeslotMutation', () => {
  const validateTimeslotAssignmentMock = vi.mocked(TimeslotValidator.validateTimeslotAssignment);
  const validateBatchAssignmentMock = vi.mocked(TimeslotValidator.validateBatchAssignment);
  const addTimeslotMock = vi.mocked(TimeslotService.addTimeslot);
  const deleteTimeslotMock = vi.mocked(TimeslotService.deleteTimeslot);
  const batchAssignTimeslotsMock = vi.mocked(TimeslotService.batchAssignTimeslots);
  const batchAssignDoubleHeadersMock = vi.mocked(TimeslotService.batchAssignDoubleHeaders);
  const assignByeWeekMock = vi.mocked(ByeWeekService.assignByeWeek);
  const batchAssignByeWeeksMock = vi.mocked(ByeWeekService.batchAssignByeWeeks);
  const removeByeWeekMock = vi.mocked(ByeWeekService.removeByeWeek);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addTimeslot: invalid input returns null, avoids service, and shows validation toast', async () => {
    validateTimeslotAssignmentMock.mockReturnValue({
      valid: false,
      error: 'Missing team',
    } as ValidationResult);

    const { result } = renderHook(() => useTimeslotMutation());

    await expect(result.current.addTimeslot(TEST_DATE, '', '18:00')).resolves.toBeNull();

    expect(addTimeslotMock).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: 'Validation Error',
      description: 'Missing team',
      variant: 'destructive',
    });
  });

  it('addTimeslot: success returns first row, invalidates date keys, and toggles isSubmitting', async () => {
    validateTimeslotAssignmentMock.mockReturnValue({ valid: true } as ValidationResult);
    const deferred = createDeferred<TeamTimeslot[]>();
    addTimeslotMock.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.addTimeslot(TEST_DATE, 'team-1', '18:00');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    await act(() => {
      deferred.resolve([sampleSlot('slot-1')]);
    });

    await expect(pending).resolves.toEqual(sampleSlot('slot-1'));
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots', FORMATTED_DATE] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['match-timeslots', FORMATTED_DATE],
    });
  });

  it('addTimeslot: error toasts destructively, rethrows, and resets isSubmitting', async () => {
    validateTimeslotAssignmentMock.mockReturnValue({ valid: true } as ValidationResult);
    const deferred = createDeferred<TeamTimeslot[]>();
    addTimeslotMock.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.addTimeslot(TEST_DATE, 'team-1', '18:00');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    const rejection = expect(pending).rejects.toThrow('add failed');
    await act(() => {
      deferred.reject(new Error('add failed'));
    });

    await rejection;
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'add failed',
      variant: 'destructive',
    });
  });

  it('deleteTimeslot: success invalidates broad keys, returns true, and toggles isSubmitting', async () => {
    const deferred = createDeferred<undefined>();
    deleteTimeslotMock.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.deleteTimeslot('slot-1');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    await act(() => {
      deferred.resolve();
    });

    await expect(pending).resolves.toBe(true);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['match-timeslots'] });
  });

  it('deleteTimeslot: error rethrows, toasts, and toggles isSubmitting back to false', async () => {
    const deferred = createDeferred<undefined>();
    deleteTimeslotMock.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.deleteTimeslot('slot-1');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    const rejection = expect(pending).rejects.toThrow('delete failed');
    await act(() => {
      deferred.reject(new Error('delete failed'));
    });

    await rejection;
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'delete failed',
      variant: 'destructive',
    });
  });

  it('batchAssignTimeslots: validation failure returns null and shows validation toast', async () => {
    validateBatchAssignmentMock.mockReturnValue({
      valid: false,
      error: 'Invalid batch',
    } as ValidationResult);
    const { result } = renderHook(() => useTimeslotMutation());

    await expect(
      result.current.batchAssignTimeslots(TEST_DATE, ['team-1'], '18:00')
    ).resolves.toBeNull();
    expect(batchAssignTimeslotsMock).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: 'Validation Error',
      description: 'Invalid batch',
      variant: 'destructive',
    });
  });

  it('batchAssignTimeslots: success invalidates date keys and toggles isSubmitting', async () => {
    validateBatchAssignmentMock.mockReturnValue({ valid: true } as ValidationResult);
    const deferred = createDeferred<TeamTimeslot[]>();
    batchAssignTimeslotsMock.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.batchAssignTimeslots(TEST_DATE, ['team-1', 'team-2'], '18:00');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    await act(() => {
      deferred.resolve([sampleSlot('slot-1'), sampleSlot('slot-2')]);
    });

    await expect(pending).resolves.toEqual([sampleSlot('slot-1'), sampleSlot('slot-2')]);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots', FORMATTED_DATE] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['match-timeslots', FORMATTED_DATE],
    });
  });

  it('batchAssignTimeslots: error toasts, rethrows, and resets isSubmitting', async () => {
    validateBatchAssignmentMock.mockReturnValue({ valid: true } as ValidationResult);
    const deferred = createDeferred<TeamTimeslot[]>();
    batchAssignTimeslotsMock.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.batchAssignTimeslots(TEST_DATE, ['team-1'], '18:00');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    const rejection = expect(pending).rejects.toThrow('batch failed');
    await act(() => {
      deferred.reject(new Error('batch failed'));
    });

    await rejection;
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'batch failed',
      variant: 'destructive',
    });
  });

  it('batchAssignDoubleHeaders: validates empty team list', async () => {
    const { result } = renderHook(() => useTimeslotMutation());

    await expect(
      result.current.batchAssignDoubleHeaders(TEST_DATE, [], '18:00', '19:00')
    ).resolves.toBeNull();
    expect(batchAssignDoubleHeadersMock).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: 'Validation Error',
      description: 'Please select at least one team',
      variant: 'destructive',
    });
  });

  it('batchAssignDoubleHeaders: validates missing slots', async () => {
    const { result } = renderHook(() => useTimeslotMutation());

    await expect(
      result.current.batchAssignDoubleHeaders(TEST_DATE, ['team-1'], '18:00', '')
    ).resolves.toBeNull();
    expect(batchAssignDoubleHeadersMock).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: 'Validation Error',
      description: 'Please select two timeslots for double header',
      variant: 'destructive',
    });
  });

  it('batchAssignDoubleHeaders: validates duplicate slots', async () => {
    const { result } = renderHook(() => useTimeslotMutation());

    await expect(
      result.current.batchAssignDoubleHeaders(TEST_DATE, ['team-1'], '18:00', '18:00')
    ).resolves.toBeNull();
    expect(batchAssignDoubleHeadersMock).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: 'Validation Error',
      description: 'Please select two different timeslots for double header',
      variant: 'destructive',
    });
  });

  it('batchAssignDoubleHeaders: success invalidates date keys and toggles isSubmitting', async () => {
    const deferred = createDeferred<TeamTimeslot[]>();
    batchAssignDoubleHeadersMock.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.batchAssignDoubleHeaders(
      TEST_DATE,
      ['team-1'],
      '18:00',
      '19:00'
    );
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    await act(() => {
      deferred.resolve([sampleSlot('slot-1'), sampleSlot('slot-2')]);
    });

    await expect(pending).resolves.toEqual([sampleSlot('slot-1'), sampleSlot('slot-2')]);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots', FORMATTED_DATE] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['match-timeslots', FORMATTED_DATE],
    });
  });

  it('batchAssignDoubleHeaders: error toggles isSubmitting and rethrows with destructive toast', async () => {
    const deferred = createDeferred<TeamTimeslot[]>();
    batchAssignDoubleHeadersMock.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.batchAssignDoubleHeaders(
      TEST_DATE,
      ['team-1'],
      '18:00',
      '19:00'
    );
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    const rejection = expect(pending).rejects.toThrow('double header failed');
    await act(() => {
      deferred.reject(new Error('double header failed'));
    });

    await rejection;
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'double header failed',
      variant: 'destructive',
    });
  });

  it('assignByeWeek: success and error both toggle isSubmitting with invalidation/toast assertions', async () => {
    const { result } = renderHook(() => useTimeslotMutation());

    const successDeferred = createDeferred<TeamTimeslot>();
    assignByeWeekMock.mockReturnValueOnce(successDeferred.promise);
    const successPending = result.current.assignByeWeek(TEST_DATE, 'team-1');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    await act(() => {
      successDeferred.resolve(sampleSlot('bye-1'));
    });

    await expect(successPending).resolves.toEqual(sampleSlot('bye-1'));
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots', FORMATTED_DATE] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['match-timeslots', FORMATTED_DATE],
    });

    const errorDeferred = createDeferred<TeamTimeslot>();
    assignByeWeekMock.mockReturnValueOnce(errorDeferred.promise);
    const errorPending = result.current.assignByeWeek(TEST_DATE, 'team-2');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    const errorRejection = expect(errorPending).rejects.toThrow('bye failed');
    await act(() => {
      errorDeferred.reject(new Error('bye failed'));
    });

    await errorRejection;
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'bye failed',
      variant: 'destructive',
    });
  });

  it('batchAssignByeWeeks: success and error both toggle isSubmitting with invalidation/toast assertions', async () => {
    const { result } = renderHook(() => useTimeslotMutation());

    const successDeferred = createDeferred<TeamTimeslot[]>();
    batchAssignByeWeeksMock.mockReturnValueOnce(successDeferred.promise);
    const successPending = result.current.batchAssignByeWeeks(TEST_DATE, ['team-1', 'team-2']);
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    await act(() => {
      successDeferred.resolve([sampleSlot('bye-1'), sampleSlot('bye-2')]);
    });

    await expect(successPending).resolves.toEqual([sampleSlot('bye-1'), sampleSlot('bye-2')]);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots', FORMATTED_DATE] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['match-timeslots', FORMATTED_DATE],
    });

    const errorDeferred = createDeferred<TeamTimeslot[]>();
    batchAssignByeWeeksMock.mockReturnValueOnce(errorDeferred.promise);
    const errorPending = result.current.batchAssignByeWeeks(TEST_DATE, ['team-3']);
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    const errorRejection = expect(errorPending).rejects.toThrow('batch bye failed');
    await act(() => {
      errorDeferred.reject(new Error('batch bye failed'));
    });

    await errorRejection;
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'batch bye failed',
      variant: 'destructive',
    });
  });

  it('removeByeWeek: success and error both toggle isSubmitting with invalidation/toast assertions', async () => {
    const { result } = renderHook(() => useTimeslotMutation());

    const successDeferred = createDeferred<undefined>();
    removeByeWeekMock.mockReturnValueOnce(successDeferred.promise);
    const successPending = result.current.removeByeWeek('bye-1');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    successDeferred.resolve();

    await expect(successPending).resolves.toBe(true);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['match-timeslots'] });

    const errorDeferred = createDeferred<undefined>();
    removeByeWeekMock.mockReturnValueOnce(errorDeferred.promise);
    const errorPending = result.current.removeByeWeek('bye-2');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    const errorRejection = expect(errorPending).rejects.toThrow('remove bye failed');
    await act(() => {
      errorDeferred.reject(new Error('remove bye failed'));
    });

    await errorRejection;
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'remove bye failed',
      variant: 'destructive',
    });
  });
});
