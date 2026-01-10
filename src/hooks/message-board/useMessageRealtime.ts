import { useEffect } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/reactions';

export const useMessageRealtime = (
  onMessageInserted: (message: Message) => void,
  onMessageUpdated: (message: Message) => void,
  onMessageDeleted: (message: Message) => void
) => {
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
          onMessageInserted(newMessage);
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
          onMessageUpdated(updatedMessage);
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
          onMessageDeleted(deletedMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onMessageInserted, onMessageUpdated, onMessageDeleted]);
};
