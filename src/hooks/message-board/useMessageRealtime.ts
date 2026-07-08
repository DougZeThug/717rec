import { useEffect, useRef } from 'react';

import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/reactions';

export const useMessageRealtime = (
  onMessageInserted: (message: Message) => void,
  onMessageUpdated: (message: Message) => void,
  onMessageDeleted: (message: Message) => void,
  onReconnect?: () => void
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

  const reconnectRef = useRef(onReconnect);
  useEffect(() => {
    reconnectRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    const { dispose } = subscribeWithRetry({
      label: 'useMessageRealtime',
      build: () =>
        supabase
          .channel(`message-board-realtime-${Math.random().toString(36).slice(2)}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
              handlersRef.current.onMessageInserted(payload.new as Message);
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'messages' },
            (payload) => {
              handlersRef.current.onMessageUpdated(payload.new as Message);
            }
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'messages' },
            (payload) => {
              handlersRef.current.onMessageDeleted(payload.old as Message);
            }
          ),
      onReconnect: (isFirst) => {
        if (!isFirst) reconnectRef.current?.();
      },
    });
    return () => dispose();
  }, []); // Empty deps - callbacks are accessed via ref
};
