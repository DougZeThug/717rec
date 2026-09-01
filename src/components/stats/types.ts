import type { RankingSortField } from '@/utils/rankingUtils';

export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  /**
   * Typed so a heading cannot be wired to a column `sortRankings` has no case
   * for. See B-34 in docs/product-description/bug-triage.md.
   */
  field: RankingSortField;
  direction: SortDirection;
}
