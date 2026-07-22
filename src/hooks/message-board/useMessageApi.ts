import { useCallback } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import { toast } from '@/hooks/useToast';
import { MessageService } from '@/services/messages/MessageService';
import { MessageCategory } from '@/types/reactions';
import { errorLog } from '@/utils/logger';

import { MessageQueryOptions } from './types';

export const useMessageApi = () => {
  const { user, profile } = useAuth();
  const { membership } = useTeamMembership();

  // Cancellation is owned by TanStack Query: the caller (useMessageBoard's
  // queryFn) passes the signal the library hands it, and the library discards
  // aborted requests itself. Aborts and failures must reject — resolving with
  // [] here would let an aborted request be cached as an empty page.
  const fetchMessages = useCallback(
    (options: MessageQueryOptions = {}, signal?: AbortSignal) =>
      MessageService.fetchMessages(options, signal),
    []
  );

  const createMessage = async (content: string, category: MessageCategory = 'General') => {
    if (!user || !profile?.username) {
      toast({
        title: 'Not authenticated',
        description: 'You must be logged in to post messages',
        variant: 'destructive',
      });
      throw new Error('User not authenticated');
    }

    const newMessage = {
      content,
      category,
      user_id: user.id,
      username: profile.username || 'Anonymous',
      team_id: membership?.team_id || null,
      team_name: membership?.team?.name || null,
    };

    try {
      await MessageService.createMessage(newMessage);
    } catch (e) {
      errorLog('Failed to create message:', e);
      toast({
        title: 'Error posting message',
        description: 'Your message could not be posted. Please try again.',
        variant: 'destructive',
      });
      throw new Error('Failed to create message', { cause: e });
    }
  };

  const updateMessage = async (messageId: string, content: string) => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'You must be logged in to edit messages',
        variant: 'destructive',
      });
      throw new Error('User not authenticated');
    }

    // Check if content is empty
    if (!content.trim()) {
      toast({
        title: 'Invalid content',
        description: 'Message content cannot be empty',
        variant: 'destructive',
      });
      throw new Error('Message content cannot be empty');
    }

    try {
      await MessageService.updateMessage(messageId, user.id, content);
    } catch (e) {
      errorLog('Failed to update message:', e);
      toast({
        title: 'Error updating message',
        description: 'Your message could not be updated. Please try again.',
        variant: 'destructive',
      });
      throw new Error('Failed to update message', { cause: e });
    }

    toast({
      title: 'Message updated',
      description: 'Your message has been updated',
    });

    return true;
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'You must be logged in to delete messages',
        variant: 'destructive',
      });
      throw new Error('User not authenticated');
    }

    try {
      await MessageService.deleteMessage(messageId, user.id);
    } catch (e) {
      errorLog('Failed to delete message:', e);
      toast({
        title: 'Error deleting message',
        description: 'Your message could not be deleted. Please try again.',
        variant: 'destructive',
      });
      throw new Error('Failed to delete message', { cause: e });
    }

    toast({
      title: 'Message deleted',
      description: 'Your message has been deleted',
    });
  };

  return {
    fetchMessages,
    createMessage,
    updateMessage,
    deleteMessage,
  };
};
