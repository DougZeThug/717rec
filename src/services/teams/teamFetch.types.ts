import { Team } from '@/types';

// ─── Teams query ──────────────────────────────────────────────────────────────

export interface TeamsQueryOptions {
  divisionId?: string | null;
  includeHidden?: boolean;
  /** When false, the query will not execute. Useful for lazy loading. */
  enabled?: boolean;
}

// ─── Membership ───────────────────────────────────────────────────────────────

export interface TeamMembershipRecord {
  id: string;
  user_id: string;
  team_id: string;
  joined_at: string;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  /** Set when an admin refused this request. Null while pending or approved. */
  rejected_at?: string | null;
  rejected_by?: string | null;
  team?: Team;
}

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface TeamMembershipForAdmin {
  id: string;
  user_id: string;
  team_id: string;
  joined_at: string;
  is_approved: boolean;
  user: UserProfile;
  team: {
    id: string;
    name: string;
    logo_url: string | null;
    image_url: string | null;
  };
}
