import { Message, MessageCategory } from '@/types/reactions';

export interface MessageQueryOptions {
  limit?: number;
  olderThan?: string | null;
  category?: MessageCategory | null;
  teamId?: string | null;
  searchQuery?: string | null;
}

export interface UseMessageBoardResult {
  messages: Message[];
  isLoading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  filterOptions: FilterOptions;
  postMessage: (content: string, category?: MessageCategory) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  setFilter: (filter: Partial<FilterOptions>) => void;
}

export interface FilterOptions {
  category: MessageCategory | null;
  teamId: string | null;
  searchQuery: string | null;
}
