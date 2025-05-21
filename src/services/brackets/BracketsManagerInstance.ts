
/**
 * Singleton export of the bracket manager instance
 */
import { BracketsManager } from 'brackets-manager';
import { BracketsAdapter } from './adapter/BracketsAdapter';
import { CrudInterface } from 'brackets-manager/dist/types';

// Create a proper adapter instance that matches the CrudInterface expected by BracketsManager
const adapter = new BracketsAdapter() as CrudInterface;

// Create an instance of BracketsManager with our custom adapter
// The adapter implements the CrudInterface required by BracketsManager
export const manager = new BracketsManager(adapter);
