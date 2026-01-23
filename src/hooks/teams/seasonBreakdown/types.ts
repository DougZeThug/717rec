// Type definitions for Supabase query results with nested relations
export interface DivisionRelation {
  division_weight?: number;
}

export interface SeasonRelation {
  id: string;
  name: string;
  start_date: string;
}
