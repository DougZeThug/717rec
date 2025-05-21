
import { BracketsManagerAdapter } from "./adapters/BracketsManagerAdapter";
import { BracketDatabaseService } from "./services/BracketDatabaseService";

// Create and export the service
export const bracketDatabaseService = new BracketDatabaseService();

// Create and export the adapter for BracketsManager
export const bracketsManagerAdapter = new BracketsManagerAdapter();
