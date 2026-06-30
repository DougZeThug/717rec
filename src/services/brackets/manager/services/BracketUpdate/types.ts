import type { BracketsManager } from 'brackets-manager';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { BracketNormalizationService } from '../BracketNormalizationService';

export type BracketUpdateContext = {
  storage: SupabaseSqlStorage;
  manager: BracketsManager;
  normalizationService: BracketNormalizationService;
};
