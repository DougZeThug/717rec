import { vi } from 'vitest';

/**
 * Shared Supabase mock factory.
 *
 * Usage:
 *   const mock = createSupabaseMock();
 *   vi.mock('@/integrations/supabase/client', () => ({ supabase: mock.client }));
 *
 *   // In a test:
 *   mock.from('teams').select().order().resolves({ data: rows, error: null });
 *   mock.from('teams').insert().select().single().resolves({ data: row, error: null });
 *
 *   // In beforeEach:
 *   mock.reset();
 */

interface MockResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string; details?: string | null; hint?: string | null; name?: string } | null;
}

type ChainMethod =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'eq'
  | 'neq'
  | 'in'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'order'
  | 'single'
  | 'match'
  | 'maybeSingle'
  | 'limit'
  | 'range'
  | 'is'
  | 'not'
  | 'contains'
  | 'or'
  | 'filter'
  | 'textSearch';

interface ChainBuilder {
  /** Call any chainable Supabase method — returns `this` for further chaining. */
  select: (query?: string) => ChainBuilder;
  insert: (data?: unknown) => ChainBuilder;
  update: (data?: unknown) => ChainBuilder;
  delete: () => ChainBuilder;
  eq: (column: string, value: unknown) => ChainBuilder;
  neq: (column: string, value: unknown) => ChainBuilder;
  in: (column: string, values: unknown[]) => ChainBuilder;
  gte: (column: string, value: unknown) => ChainBuilder;
  gt: (column: string, value: unknown) => ChainBuilder;
  lt: (column: string, value: unknown) => ChainBuilder;
  lte: (column: string, value: unknown) => ChainBuilder;
  order: (column: string, options?: unknown) => ChainBuilder;
  single: () => ChainBuilder;
  maybeSingle: () => ChainBuilder;
  match: (criteria: Record<string, unknown>) => ChainBuilder;
  limit: (count: number) => ChainBuilder;
  range: (from: number, to: number) => ChainBuilder;
  is: (column: string, value: unknown) => ChainBuilder;
  not: (column: string, operator: string, value: unknown) => ChainBuilder;
  contains: (column: string, value: unknown) => ChainBuilder;
  or: (filters: string) => ChainBuilder;
  filter: (column: string, operator: string, value: unknown) => ChainBuilder;
  textSearch: (column: string, query: string, options?: unknown) => ChainBuilder;

  /** Terminal — set the value the chain will resolve to when awaited. */
  resolves: (result: MockResult) => void;
}

export interface SupabaseMock {
  /** The mock client object — pass to vi.mock. */
  client: { from: ReturnType<typeof vi.fn> };

  /** The raw `mockFrom` spy — use for assertions like `expect(mock.mockFrom).toHaveBeenCalledWith('teams')`. */
  mockFrom: ReturnType<typeof vi.fn>;

  /** Start building a chain expectation for a specific table. */
  from: (table: string) => ChainBuilder;

  /** Clear all mock state. Call in `beforeEach`. */
  reset: () => void;
}

/**
 * Creates a chainable Supabase mock.
 *
 * The mock works in two modes:
 *
 * **Setup mode** (before the code under test runs):
 *   Call `mock.from('table').select().order().resolves({ data, error })` to
 *   configure what the chain will return.
 *
 * **Runtime mode** (when production code calls `supabase.from('table').select()...`):
 *   The mock returns a thenable chain that resolves to the configured result.
 */
export function createSupabaseMock(): SupabaseMock {
  // Stores the configured result per table (last-write wins per table).
  let pendingResults: Map<string, MockResult> = new Map();

  // Spies for each chain method, keyed by method name.
  const spies: Record<string, ReturnType<typeof vi.fn>> = {};

  const CHAIN_METHODS: ChainMethod[] = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'in', 'gte', 'gt', 'lt', 'lte',
    'order', 'single', 'maybeSingle', 'match',
    'limit', 'range', 'is', 'not', 'contains',
    'or', 'filter', 'textSearch',
  ];

  for (const method of CHAIN_METHODS) {
    spies[method] = vi.fn();
  }

  /** Build a thenable chain object that resolves to `result`. */
  function makeRuntimeChain(tableName: string): Record<string, unknown> & PromiseLike<MockResult> {
    const getResult = (): MockResult => pendingResults.get(tableName) ?? { data: null, error: null };

    const chain: Record<string, unknown> = {};

    for (const method of CHAIN_METHODS) {
      chain[method] = (...args: unknown[]) => {
        spies[method](...args);
        return chain;
      };
    }

    // Make the chain thenable so `await supabase.from(t).select()...` works.
    chain.then = (onFulfilled?: (v: MockResult) => unknown, onRejected?: (r: unknown) => unknown) =>
      Promise.resolve(getResult()).then(onFulfilled, onRejected);
    chain.catch = (onRejected?: (r: unknown) => unknown) =>
      Promise.resolve(getResult()).catch(onRejected);

    return chain as Record<string, unknown> & PromiseLike<MockResult>;
  }

  const mockFrom = vi.fn((tableName: string) => makeRuntimeChain(tableName));

  /** Setup-mode chain builder — used in tests to configure return values. */
  function makeSetupChain(tableName: string): ChainBuilder {
    const builder: Record<string, unknown> = {};

    for (const method of CHAIN_METHODS) {
      builder[method] = (..._args: unknown[]) => builder;
    }

    builder.resolves = (result: MockResult) => {
      pendingResults.set(tableName, result);
    };

    return builder as unknown as ChainBuilder;
  }

  return {
    client: { from: mockFrom },
    mockFrom,
    from: (table: string) => makeSetupChain(table),
    reset: () => {
      pendingResults = new Map();
      mockFrom.mockClear();
      for (const spy of Object.values(spies)) {
        spy.mockClear();
      }
    },
  };
}
