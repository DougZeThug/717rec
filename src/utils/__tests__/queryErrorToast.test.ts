import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '@/types/errors';
import { handleMutationError, handleQueryError } from '@/utils/queryErrorToast';

const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

const mockCount = vi.fn();
vi.mock('@/utils/sentry', () => ({
  metrics: { count: (...args: unknown[]) => mockCount(...args) },
}));

const mockErrorLog = vi.fn();
vi.mock('@/utils/logger', () => ({
  errorLog: (...args: unknown[]) => mockErrorLog(...args),
}));

/** A real Query, so the handler is exercised against the shape it gets in App. */
const makeQuery = (meta?: Record<string, unknown>) => {
  const cache = new QueryCache();
  const client = new QueryClient({ queryCache: cache });
  // Promise.resolve rather than an async arrow: this query is only built to be
  // handed to handleQueryError, never run, so the arrow had no await in it.
  cache.build(client, {
    queryKey: ['widgets', 'list'],
    queryFn: () => Promise.resolve(null),
    meta,
  });
  return cache.getAll()[0];
};

describe('handleQueryError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts the failure and raises one toast for a query that opted in', () => {
    handleQueryError(new Error('boom'), makeQuery({ errorToast: 'Failed to load widgets' }));

    expect(mockCount).toHaveBeenCalledExactlyOnceWith('query_error', 1, { type: 'query' });
    expect(mockToast).toHaveBeenCalledExactlyOnceWith({
      title: 'Error',
      description: expect.any(String),
      variant: 'destructive',
    });
  });

  it('appends the reason when the error carries one a user can act on', () => {
    handleQueryError(
      new NotFoundError('Season', 's1'),
      makeQuery({ errorToast: 'Failed to load' })
    );

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('Failed to load: ') })
    );
  });

  it('shows the meta wording alone when the reason is not fit to show', () => {
    // A bare Error is not one of the typed app errors, so its message could be
    // any raw database internal. getUIErrorMessage withholds it.
    handleQueryError(
      new Error('relation "x" does not exist'),
      makeQuery({ errorToast: 'Failed to load' })
    );

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Failed to load. Please try again.' })
    );
  });

  it('stays silent for a query that did not opt in', () => {
    handleQueryError(new Error('boom'), makeQuery());

    // Most queries carry no meta. They are still counted, but the user is not
    // interrupted for a read they never asked for.
    expect(mockCount).toHaveBeenCalledTimes(1);
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('stays silent when errorToast is present but not a string', () => {
    handleQueryError(new Error('boom'), makeQuery({ errorToast: 42 }));

    expect(mockCount).toHaveBeenCalledTimes(1);
    expect(mockToast).not.toHaveBeenCalled();
  });
});

/** A real Mutation, so the handler meets the shape MutationCache hands it. */
const makeMutation = (mutationKey?: readonly unknown[]) => {
  const cache = new MutationCache();
  const client = new QueryClient({ mutationCache: cache });
  return cache.build(client, { mutationKey, mutationFn: () => Promise.resolve(null) });
};

describe('handleMutationError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts the failure and names the mutation in the log', () => {
    handleMutationError(
      new Error('boom'),
      undefined,
      undefined,
      makeMutation(['scores', 'submit'])
    );

    expect(mockCount).toHaveBeenCalledWith('mutation_error', 1, { type: 'mutation' });
    expect(mockErrorLog).toHaveBeenCalledWith(
      'Mutation failed: ["scores","submit"]',
      expect.any(Error)
    );
  });

  it('still counts and logs a mutation that carries no key', () => {
    handleMutationError(new Error('boom'), undefined, undefined, makeMutation());

    expect(mockCount).toHaveBeenCalledTimes(1);
    expect(mockErrorLog).toHaveBeenCalledWith('Mutation failed', expect.any(Error));
  });

  it('does not interrupt the user', () => {
    handleMutationError(
      new Error('boom'),
      undefined,
      undefined,
      makeMutation(['scores', 'submit'])
    );

    // A mutation is something the user asked for, so the code that started it
    // owns the message. This is only the backstop that records the failure.
    expect(mockToast).not.toHaveBeenCalled();
  });
});
