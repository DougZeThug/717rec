
import { v4 as uuidv4 } from "uuid";

// For tracking inserted values
export let insertedRows: Record<string, any[]> = {};

// Helper to check if string is a valid UUID
export const isValidUUID = (str: string) => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(str);
};

// Reset the insertedRows between tests
export const resetInsertedRows = () => {
  insertedRows = {};
};

// Mock Supabase client
export const supabase = {
  from: (tableName: string) => ({
    select: (query?: string) => ({
      eq: (column: string, value: any) => ({
        single: () => Promise.resolve({ data: null, error: null }),
        then: (callback: Function) => Promise.resolve({ data: [], error: null }).then(callback)
      }),
      then: (callback: Function) => Promise.resolve({ data: [], error: null }).then(callback)
    }),
    insert: (data: any | any[]) => {
      // Track the inserted rows for verification
      const rows = Array.isArray(data) ? data : [data];
      
      if (!insertedRows[tableName]) {
        insertedRows[tableName] = [];
      }
      
      console.log(`Mock inserting into ${tableName}:`, rows);
      
      // Add the rows to our tracking object
      insertedRows[tableName].push(...rows);
      
      return Promise.resolve({ data: rows, error: null });
    },
    update: (data: any) => ({
      eq: (column: string, value: any) => Promise.resolve({ data, error: null }),
      match: (criteria: Record<string, any>) => Promise.resolve({ data, error: null })
    })
  })
};

// Mock UUID for consistent testing
vi.mock('uuid', () => ({
  v4: vi.fn().mockImplementation(() => 
    '00000000-0000-0000-0000-000000000000'
  )
}));
