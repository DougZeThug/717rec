import type { MessageQueryOptions } from './types';

export const messageBoardKeys = {
  messages: (options: MessageQueryOptions) => ['message-board', 'messages', options] as const,
  reactions: (messageId: string) => ['message-board', 'reactions', messageId] as const,
};
