import { useEffect, useRef } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/reactions';

export const useMessageRealtime = (
  onMessageInserted: (message: Message) => void,
  onMessageUpdated: (message: Message) => void,
  onMessageDeleted: (message: Message) => void
) => {
  // Use ref to hold callbacks to prevent subscription recreation
  const handlersRef = useRef({
    onMessageInserted,
    onMessageUpdated,
    onMessageDeleted,
  });

  // Update ref when callbacks change
  useEffect(() => {
    handlersRef.current = {
      onMessageInserted,
      onMessageUpdated,
      onMessageDeleted,
    };
  }, [onMessageInserted, onMessageUpdated, onMessageDeleted]);

  useEffect(() => {
    const channel = supabase
      .channel('message-board-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          handlersRef.current.onMessageInserted(newMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          handlersRef.current.onMessageUpdated(updatedMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const deletedMessage = payload.old as Message;
          handlersRef.current.onMessageDeleted(deletedMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Empty deps - callbacks are accessed via ref
};
