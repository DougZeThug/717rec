import type { FilterOptions, MessageQueryOptions } from './types';

export const messageBoardKeys = {
  messages: (filters: FilterOptions) => ['message-board', 'messages', filters] as const,
  page: (options: MessageQueryOptions) => ['message-board', 'messages-page', options] as const,
  reactions: (messageId: string) => ['message-board', 'reactions', messageId] as const,
};
