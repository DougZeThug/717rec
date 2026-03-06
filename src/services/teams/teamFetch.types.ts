import { Team } from '@/types';

// ─── TeamAnalysis ─────────────────────────────────────────────────────────────

export interface TeamAnalysis {
  id: string;
  team_id: string;
  overall: string | null;
  strengths: string[];
  weaknesses: string[];
  trends: string | null;
  rivalry_insights: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamAnalysisInput {
  overall?: string;
  strengths?: string[];
  weaknesses?: string[];
  trends?: string;
  rivalry_insights?: string;
}

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
  team?: Team;
}

export interface UserProfile {
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
