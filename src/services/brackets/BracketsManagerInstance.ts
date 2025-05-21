
/**
 * Singleton export of the bracket manager instance
 */
import { BracketsManager } from 'brackets-manager';
import { bracketsAdapter } from './adapter/BracketsManagerAdapter';

// Create an instance of BracketsManager with our adapter
// The adapter fully implements the CrudInterface required by BracketsManager
export const manager = new BracketsManager(bracketsAdapter as any);
