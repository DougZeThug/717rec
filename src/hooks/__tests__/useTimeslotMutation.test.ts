import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimeslotMutation } from '../useTimeslotMutation';

const invalidateQueries = vi.fn();
const toast = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries,
  }),
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

import { ByeWeekService } from '@/services/timeslots/ByeWeekService';
import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotValidator } from '@/services/timeslots/TimeslotValidator';

const TEST_DATE = new Date('2026-03-14T00:00:00.000Z');
const FORMATTED_DATE = '2026-03-14';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useTimeslotMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addTimeslot: returns null for invalid input, does not call service, and shows validation toast', async () => {
    (TimeslotValidator.validateTimeslotAssignment as any).mockReturnValue({
      valid: false,
      error: 'Missing team',
    });

    const { result } = renderHook(() => useTimeslotMutation());

    await expect(result.current.addTimeslot(TEST_DATE, '', '18:00')).resolves.toBeNull();

    expect(TimeslotService.addTimeslot).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: 'Validation Error',
      description: 'Missing team',
      variant: 'destructive',
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('addTimeslot: returns first row and invalidates date-specific keys on success', async () => {
    (TimeslotValidator.validateTimeslotAssignment as any).mockReturnValue({ valid: true });
    (TimeslotService.addTimeslot as any).mockResolvedValue([
      { id: 'slot-1', team_id: 'team-1', timeslot: '18:00' },
      { id: 'slot-2', team_id: 'team-1', timeslot: '19:00' },
    ]);

    const { result } = renderHook(() => useTimeslotMutation());
    const deferred = createDeferred<any[]>();
    (TimeslotService.addTimeslot as any).mockReturnValueOnce(deferred.promise);

    const pending = result.current.addTimeslot(TEST_DATE, 'team-1', '18:00');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    deferred.resolve([{ id: 'slot-1', team_id: 'team-1', timeslot: '18:00' }]);

    await expect(pending).resolves.toEqual({ id: 'slot-1', team_id: 'team-1', timeslot: '18:00' });
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots', FORMATTED_DATE] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['match-timeslots', FORMATTED_DATE] });
  });

  it('addTimeslot: shows destructive toast, rethrows, and resets isSubmitting on error', async () => {
    (TimeslotValidator.validateTimeslotAssignment as any).mockReturnValue({ valid: true });
    const deferred = createDeferred<any[]>();
    (TimeslotService.addTimeslot as any).mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.addTimeslot(TEST_DATE, 'team-1', '18:00');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    deferred.reject(new Error('add failed'));

    await expect(pending).rejects.toThrow('add failed');
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'add failed',
      variant: 'destructive',
    });
  });

  it('deleteTimeslot: returns true and invalidates broad keys on success with isSubmitting toggle', async () => {
    const deferred = createDeferred<void>();
    (TimeslotService.deleteTimeslot as any).mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.deleteTimeslot('slot-1');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    deferred.resolve();

    await expect(pending).resolves.toBe(true);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['match-timeslots'] });
  });

  it('batchAssignTimeslots: validation failure returns null and toasts', async () => {
    (TimeslotValidator.validateBatchAssignment as any).mockReturnValue({
      valid: false,
      error: 'Invalid batch',
    });

    const { result } = renderHook(() => useTimeslotMutation());

    await expect(result.current.batchAssignTimeslots(TEST_DATE, ['team-1'], '18:00')).resolves.toBeNull();
    expect(TimeslotService.batchAssignTimeslots).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: 'Validation Error',
      description: 'Invalid batch',
      variant: 'destructive',
    });
  });

  it('batchAssignTimeslots: success invalidates date keys and toggles isSubmitting', async () => {
    (TimeslotValidator.validateBatchAssignment as any).mockReturnValue({ valid: true });
    const deferred = createDeferred<any[]>();
    (TimeslotService.batchAssignTimeslots as any).mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.batchAssignTimeslots(TEST_DATE, ['team-1', 'team-2'], '18:00');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    deferred.resolve([{ id: 'slot-1' }, { id: 'slot-2' }]);

    await expect(pending).resolves.toEqual([{ id: 'slot-1' }, { id: 'slot-2' }]);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots', FORMATTED_DATE] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['match-timeslots', FORMATTED_DATE] });
  });

  it('batchAssignTimeslots: error toasts, rethrows, and resets isSubmitting', async () => {
    (TimeslotValidator.validateBatchAssignment as any).mockReturnValue({ valid: true });
    const deferred = createDeferred<any[]>();
    (TimeslotService.batchAssignTimeslots as any).mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.batchAssignTimeslots(TEST_DATE, ['team-1'], '18:00');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    deferred.reject(new Error('batch failed'));

    await expect(pending).rejects.toThrow('batch failed');
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'batch failed',
      variant: 'destructive',
    });
  });

  it('batchAssignDoubleHeaders: validates empty team list', async () => {
    const { result } = renderHook(() => useTimeslotMutation());

    await expect(result.current.batchAssignDoubleHeaders(TEST_DATE, [], '18:00', '19:00')).resolves.toBeNull();
    expect(TimeslotService.batchAssignDoubleHeaders).not.toHaveBeenCalled();
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
    expect(TimeslotService.batchAssignDoubleHeaders).not.toHaveBeenCalled();
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
    expect(TimeslotService.batchAssignDoubleHeaders).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: 'Validation Error',
      description: 'Please select two different timeslots for double header',
      variant: 'destructive',
    });
  });

  it('batchAssignDoubleHeaders: success path invalidates date keys and toggles isSubmitting', async () => {
    const deferred = createDeferred<any[]>();
    (TimeslotService.batchAssignDoubleHeaders as any).mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.batchAssignDoubleHeaders(TEST_DATE, ['team-1'], '18:00', '19:00');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    deferred.resolve([{ id: 'slot-1' }, { id: 'slot-2' }]);

    await expect(pending).resolves.toEqual([{ id: 'slot-1' }, { id: 'slot-2' }]);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots', FORMATTED_DATE] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['match-timeslots', FORMATTED_DATE] });
  });

  it('assignByeWeek: success and error both toggle isSubmitting and invalidate/toast correctly', async () => {
    const { result } = renderHook(() => useTimeslotMutation());

    const successDeferred = createDeferred<any>();
    (ByeWeekService.assignByeWeek as any).mockReturnValueOnce(successDeferred.promise);
    const successPending = result.current.assignByeWeek(TEST_DATE, 'team-1');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    successDeferred.resolve({ id: 'bye-1', is_bye_week: true });

    await expect(successPending).resolves.toEqual({ id: 'bye-1', is_bye_week: true });
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots', FORMATTED_DATE] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['match-timeslots', FORMATTED_DATE] });

    const errorDeferred = createDeferred<any>();
    (ByeWeekService.assignByeWeek as any).mockReturnValueOnce(errorDeferred.promise);
    const errorPending = result.current.assignByeWeek(TEST_DATE, 'team-2');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    errorDeferred.reject(new Error('bye failed'));

    await expect(errorPending).rejects.toThrow('bye failed');
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'bye failed',
      variant: 'destructive',
    });
  });

  it('batchAssignByeWeeks: success and error both toggle isSubmitting and invalidate/toast correctly', async () => {
    const { result } = renderHook(() => useTimeslotMutation());

    const successDeferred = createDeferred<any[]>();
    (ByeWeekService.batchAssignByeWeeks as any).mockReturnValueOnce(successDeferred.promise);
    const successPending = result.current.batchAssignByeWeeks(TEST_DATE, ['team-1', 'team-2']);
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    successDeferred.resolve([{ id: 'bye-1' }, { id: 'bye-2' }]);

    await expect(successPending).resolves.toEqual([{ id: 'bye-1' }, { id: 'bye-2' }]);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots', FORMATTED_DATE] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['match-timeslots', FORMATTED_DATE] });

    const errorDeferred = createDeferred<any[]>();
    (ByeWeekService.batchAssignByeWeeks as any).mockReturnValueOnce(errorDeferred.promise);
    const errorPending = result.current.batchAssignByeWeeks(TEST_DATE, ['team-3']);
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    errorDeferred.reject(new Error('batch bye failed'));

    await expect(errorPending).rejects.toThrow('batch bye failed');
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'batch bye failed',
      variant: 'destructive',
    });
  });

  it('removeByeWeek: success and error both toggle isSubmitting and invalidate/toast correctly', async () => {
    const { result } = renderHook(() => useTimeslotMutation());

    const successDeferred = createDeferred<void>();
    (ByeWeekService.removeByeWeek as any).mockReturnValueOnce(successDeferred.promise);
    const successPending = result.current.removeByeWeek('bye-1');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    successDeferred.resolve();

    await expect(successPending).resolves.toBe(true);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['timeslots'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['match-timeslots'] });

    const errorDeferred = createDeferred<void>();
    (ByeWeekService.removeByeWeek as any).mockReturnValueOnce(errorDeferred.promise);
    const errorPending = result.current.removeByeWeek('bye-2');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    errorDeferred.reject(new Error('remove bye failed'));

    await expect(errorPending).rejects.toThrow('remove bye failed');
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'remove bye failed',
      variant: 'destructive',
    });
  });

  it('deleteTimeslot: error toggles isSubmitting and rethrows with destructive toast', async () => {
    const deferred = createDeferred<void>();
    (TimeslotService.deleteTimeslot as any).mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.deleteTimeslot('slot-1');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    deferred.reject(new Error('delete failed'));

    await expect(pending).rejects.toThrow('delete failed');
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'delete failed',
      variant: 'destructive',
    });
  });

  it('batchAssignDoubleHeaders: error toggles isSubmitting and rethrows with destructive toast', async () => {
    const deferred = createDeferred<any[]>();
    (TimeslotService.batchAssignDoubleHeaders as any).mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useTimeslotMutation());

    const pending = result.current.batchAssignDoubleHeaders(TEST_DATE, ['team-1'], '18:00', '19:00');
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    deferred.reject(new Error('double header failed'));

    await expect(pending).rejects.toThrow('double header failed');
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(toast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'double header failed',
      variant: 'destructive',
    });
  });
});
