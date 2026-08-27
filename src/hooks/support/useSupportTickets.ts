import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import {
  type SupportTicketRow,
  SupportTicketService,
} from '@/services/support/SupportTicketService';

const SUPPORT_TICKETS_QUERY_KEY = ['support-tickets'] as const;

/** Fetch all support tickets, kept fresh via a Supabase realtime subscription. */
export function useSupportTickets(enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const { dispose } = subscribeWithRetry({
      label: 'useSupportTickets',
      build: () =>
        supabase
          .channel(`support-tickets-realtime-${Math.random().toString(36).slice(2)}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () =>
            qc.invalidateQueries({ queryKey: SUPPORT_TICKETS_QUERY_KEY })
          ),
      onReconnect: (isFirst) => {
        if (!isFirst) qc.invalidateQueries({ queryKey: SUPPORT_TICKETS_QUERY_KEY });
      },
    });
    return () => dispose();
  }, [qc, enabled]);

  return useQuery<SupportTicketRow[]>({
    queryKey: SUPPORT_TICKETS_QUERY_KEY,
    queryFn: () => SupportTicketService.fetchAll(),
    enabled,
    staleTime: 60_000,
  });
}

/** Mutation to mark a support ticket resolved; shows an error toast on failure. */
export function useMarkSupportTicketResolved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SupportTicketService.markResolved(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPORT_TICKETS_QUERY_KEY }),
    onError: () =>
      toast({ title: 'Failed to mark support ticket as resolved', variant: 'destructive' }),
  });
}

/** Mutation to reopen a resolved support ticket; shows an error toast on failure. */
export function useReopenSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SupportTicketService.reopen(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPORT_TICKETS_QUERY_KEY }),
    onError: () => toast({ title: 'Failed to reopen support ticket', variant: 'destructive' }),
  });
}
