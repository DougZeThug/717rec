
export interface MatchComment {
  id: string;
  match_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
}

export interface MatchCommentInput {
  match_id: string;
  content: string;
}
