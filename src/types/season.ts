/**
 * Season-related type definitions
 */

export interface Season {
  id: string;
  name: string;
  is_active: boolean;
  is_archived: boolean;
  playoffs_active: boolean;
  /** Whether the "Confirm your team" card is shown. Not every query selects it. */
  confirmation_open?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  champion_team_id?: string | null;
  runner_up_team_id?: string | null;
}
