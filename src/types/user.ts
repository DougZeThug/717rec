export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean | null;
}

export interface TeamMembership {
  id: string;
  user_id: string;
  team_id: string;
  joined_at: string;
  team?: {
    id: string;
    name: string;
    logo_url?: string | null;
    image_url?: string | null;
  };
}
