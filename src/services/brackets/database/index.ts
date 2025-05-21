
import { BracketDatabaseService } from "./services/BracketDatabaseService";
import { BracketsManagerAdapter } from "../adapter/BracketsManagerAdapter";

// Create and export the service
export const bracketDatabaseService = new BracketDatabaseService();

// Create and export the adapter for BracketsManager
export const bracketsManagerAdapter = new BracketsManagerAdapter();
