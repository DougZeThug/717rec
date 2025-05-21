
/**
 * Singleton export of the bracket manager instance
 */
import { BracketsManager } from 'brackets-manager';
import { adapter } from './database/PlayoffDatabaseAdapter';

// Create an instance of BracketsManager with our custom adapter
// The adapter implements the CrudInterface required by BracketsManager
export const manager = new BracketsManager(adapter);
