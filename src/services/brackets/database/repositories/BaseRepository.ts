
import { supabase } from "@/integrations/supabase/client";
import { DatabaseOperationError } from "../types/DatabaseTypes";

/**
 * Base repository with common database operations
 */
export abstract class BaseRepository {
  /**
   * Execute a database query with error handling
   * @protected
   */
  protected async executeQuery<T>(
    operation: string,
    queryFn: () => Promise<{ data: T; error: any } | null>
  ): Promise<T> {
    try {
      const result = await queryFn();
      
      if (!result) {
        throw new DatabaseOperationError(operation, 'Query returned null result');
      }
      
      const { data, error } = result;
      
      if (error) {
        throw new DatabaseOperationError(operation, `Database error: ${error.message}`, error);
      }
      
      return data;
    } catch (error) {
      console.error(`Error in ${operation}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError(operation, `Unexpected error in ${operation}`, error as Error);
    }
  }

  /**
   * Execute a database operation with error handling
   * @protected
   */
  protected async executeOperation(
    operation: string,
    queryFn: () => Promise<{ error: any; count?: number } | null>
  ): Promise<number> {
    try {
      const result = await queryFn();
      
      if (!result) {
        throw new DatabaseOperationError(operation, 'Operation returned null result');
      }
      
      const { error, count } = result;
      
      if (error) {
        throw new DatabaseOperationError(operation, `Database error: ${error.message}`, error);
      }
      
      return count ?? 1; // Return count if available, otherwise 1 for success
    } catch (error) {
      console.error(`Error in ${operation}:`, error);
      return 0; // Return 0 to indicate failure
    }
  }
}
