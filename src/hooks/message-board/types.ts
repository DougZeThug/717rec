
import { Message } from "@/types/reactions";

export interface UseMessageBoardResult {
  messages: Message[];
  isLoading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  postMessage: (content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

export interface MessageQueryOptions {
  limit?: number;
  olderThan?: string | null;
}
