
export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export interface Message {
  id: string;
  content: string;
  created_at: string;
  username: string;
  team_name: string | null;
  user_id: string | null;
  team_id: string | null;
  category?: string;
  tags?: string[];
}

export type MessageCategory = 'General' | 'Question' | 'Announcement' | 'Event' | 'Other';

export const MESSAGE_CATEGORIES: MessageCategory[] = [
  'General', 
  'Question', 
  'Announcement', 
  'Event', 
  'Other'
];
