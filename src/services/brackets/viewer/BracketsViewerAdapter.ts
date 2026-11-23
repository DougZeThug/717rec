import { transformFromSql } from './SqlBracketTransformer';
import type { ViewerDataWithMapping } from './types';

export const BracketsViewerAdapter = {
  /**
   * Transform from brackets-manager SQL tables
   */
  transformFromSql(bracketId: string): Promise<ViewerDataWithMapping> {
    return transformFromSql(bracketId);
  },
};
