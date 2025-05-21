
/**
 * Singleton export of the bracket manager instance
 */
import { BracketsManager } from 'brackets-manager';
import { BracketsManagerAdapter } from './adapter/BracketsManagerAdapter';
import { CrudInterface } from 'brackets-manager/dist/types';

// Create an instance of our custom adapter that implements CrudInterface
const adapter = new BracketsManagerAdapter();

// Create an instance of BracketsManager with our adapter
// The adapter implements the CrudInterface required by BracketsManager
export const manager = new BracketsManager(adapter as unknown as CrudInterface);
