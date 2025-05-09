
import { Message, MessageCategory } from "@/types/reactions";

export interface FilterOptions {
  category: MessageCategory | 'All';
  teamId?: string | null;
  searchQuery?: string | null;
}

export interface MessageQueryOptions {
  limit?: number;
  olderThan?: string;
  category?: MessageCategory | null;
  teamId?: string | null;
  searchQuery?: string | null;
}

export interface UseMessageBoardResult {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  postMessage: (content: string, category: MessageCategory) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreMessages: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  filterOptions: FilterOptions;
  setFilter: (filter: Partial<FilterOptions>) => void;
}
