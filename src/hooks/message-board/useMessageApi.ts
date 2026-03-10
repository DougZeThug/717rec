import { useCallback, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import { toast } from '@/hooks/useToast';
import { MessageService } from '@/services/messages/MessageService';
import { Message, MessageCategory } from '@/types/reactions';

import { MessageQueryOptions } from './types';

export const useMessageApi = () => {
  const { user, profile } = useAuth();
  const { membership } = useTeamMembership();

  // Abort controller for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMessages = useCallback(async (options: MessageQueryOptions = {}) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      return await MessageService.fetchMessages(options, abortControllerRef.current.signal);
    } catch (err: unknown) {
      // Ignore abort errors - these are intentional cancellations
      if (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('aborted'))) {
        return [] as Message[];
      }
      throw err;
    }
  }, []);

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
    } catch {
      toast({
        title: 'Error posting message',
        description: 'Your message could not be posted. Please try again.',
        variant: 'destructive',
      });
      throw new Error('Failed to create message');
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
    } catch {
      toast({
        title: 'Error updating message',
        description: 'Your message could not be updated. Please try again.',
        variant: 'destructive',
      });
      throw new Error('Failed to update message');
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
    } catch {
      toast({
        title: 'Error deleting message',
        description: 'Your message could not be deleted. Please try again.',
        variant: 'destructive',
      });
      throw new Error('Failed to delete message');
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
