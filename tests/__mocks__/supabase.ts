
// Mock for the supabase client
import { v4 as uuidv4 } from 'uuid';

export const insertedRows: Record<string, any[]> = {};

export const supabase = {
  from: (table: string) => ({
    insert: (data: any) => {
      // Store the inserted data for later inspection
      if (!insertedRows[table]) {
        insertedRows[table] = [];
      }
      
      // Handle both single object and array cases
      const rowsToInsert = Array.isArray(data) ? data : [data];
      insertedRows[table].push(...rowsToInsert);
      
      console.log(`Mock: Inserted ${rowsToInsert.length} rows into ${table}`);
      
      return {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(cb => {
          cb({ data: rowsToInsert, error: null });
          return {
            catch: jest.fn()
          };
        }),
        error: null
      };
    }
  }),
  storage: {
    // Add storage methods if needed
  },
  auth: {
    // Add auth methods if needed
  }
};

// Helper function to check if a string is a valid UUID v4
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Reset the insertedRows for fresh tests
export function resetInsertedRows(): void {
  Object.keys(insertedRows).forEach(key => {
    delete insertedRows[key];
  });
}
