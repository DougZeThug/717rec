import type { MessageQueryOptions } from './types';

export const messageBoardKeys = {
  all: ['message-board', 'messages'] as const,
  messages: (options: MessageQueryOptions) => [...messageBoardKeys.all, options] as const,
  reactions: (messageId: string) => ['message-board', 'reactions', messageId] as const,
};
