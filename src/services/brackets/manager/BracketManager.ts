
import BracketsManager from 'brackets-manager';
import { BracketsAdapter } from '../adapter/BracketsAdapter';

// Create a shared instance of BracketsAdapter
const bracketsAdapter = new BracketsAdapter();

// Create a bridge to support the old-style table-based API
// This extends the adapter with the original method signatures
const adapterWithLegacySupport = {
  // Standard interface methods
  insert: (data: any[]) => bracketsAdapter.insert(data),
  select: (filter?: any) => bracketsAdapter.select(filter),
  update: (id: string, data: any) => bracketsAdapter.update(id, data),
  delete: (filter?: any) => bracketsAdapter.delete(filter),
  
  // Legacy table-based methods used by brackets-manager
  insertInto: (table: string, data: any) => bracketsAdapter.insertIntoTable(table, data),
  selectFrom: (table: string, filter?: any) => bracketsAdapter.selectFromTable(table, filter),
  updateIn: (table: string, id: string, data: any) => bracketsAdapter.updateInTable(table, id, data),
  deleteFrom: (table: string, filter?: any) => bracketsAdapter.deleteFromTable(table, filter)
};

// Create a manager instance using the adapter
export const bracketManager = new BracketsManager(adapterWithLegacySupport);
