import { vi } from 'vitest';

// For tracking inserted values
export let insertedRows: Record<string, unknown[]> = {};

// Helper to check if string is a valid UUID
export const isValidUUID = (str: string): boolean => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(str);
};

// Reset the insertedRows between tests
export const resetInsertedRows = (): void => {
  insertedRows = {};
};

// Define proper types for Supabase mock responses
interface MockSupabaseResponse<T = unknown> {
  data: T | null;
  error: Error | null;
}

interface MockSupabaseQuery {
  eq: (column: string, value: unknown) => MockSupabaseQuery;
  single: () => Promise<MockSupabaseResponse>;
  then: (callback: (result: MockSupabaseResponse) => unknown) => Promise<unknown>;
}

interface MockSupabaseTable {
  select: (query?: string) => MockSupabaseQuery;
  insert: (data: unknown | unknown[]) => Promise<MockSupabaseResponse>;
  update: (data: unknown) => {
    eq: (column: string, value: unknown) => Promise<MockSupabaseResponse>;
    match: (criteria: Record<string, unknown>) => Promise<MockSupabaseResponse>;
  };
}

// Mock Supabase client
export const supabase = {
  from: (tableName: string): MockSupabaseTable => ({
    select: (_query?: string) => ({
      eq: (_column: string, _value: unknown) => ({
        single: () => Promise.resolve({ data: null, error: null }),
        then: (callback: (result: MockSupabaseResponse) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(callback),
      }),
      then: (callback: (result: MockSupabaseResponse) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(callback),
    }),
    insert: (data: unknown | unknown[]) => {
      // Track the inserted rows for verification
      const rows = Array.isArray(data) ? data : [data];

      if (!insertedRows[tableName]) {
        insertedRows[tableName] = [];
      }

      console.log(`Mock inserting into ${tableName}:`, rows);

      // Add the rows to our tracking object
      insertedRows[tableName].push(...rows);

      // Return chainable object to support .insert().select() pattern
      const result = {
        data: rows.map((row: any, idx: number) => ({ ...row, id: idx + 1 })),
        error: null,
      };
      return {
        select: (_columns?: string) => Promise.resolve(result),
        // Allow direct await for backwards compatibility
        then: (resolve: (value: MockSupabaseResponse) => unknown) =>
          Promise.resolve(result).then(resolve),
        catch: (reject: (reason: unknown) => unknown) => Promise.resolve(result).catch(reject),
      };
    },
    update: (data: unknown) => ({
      eq: (_column: string, _value: unknown) => Promise.resolve({ data, error: null }),
      match: (_criteria: Record<string, unknown>) => Promise.resolve({ data, error: null }),
    }),
  }),
};

// Mock UUID for consistent testing
vi.mock('uuid', () => ({
  v4: vi.fn().mockImplementation(() => '00000000-0000-0000-0000-000000000000'),
}));
