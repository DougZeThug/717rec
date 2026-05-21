import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/integrations/supabase/client';
import {
  ContactRequestService,
  type ContactRequestRow,
  type SubmitContactRequestInput,
} from '@/services/contact/ContactRequestService';

export const CONTACT_REQUESTS_QUERY_KEY = ['contact-requests'] as const;

export function useContactRequests(enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`contact-requests-realtime-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_requests' },
        () => qc.invalidateQueries({ queryKey: CONTACT_REQUESTS_QUERY_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, enabled]);

  return useQuery<ContactRequestRow[]>({
    queryKey: CONTACT_REQUESTS_QUERY_KEY,
    queryFn: () => ContactRequestService.fetchAll(),
    enabled,
    staleTime: 60_000,
  });
}

export function useSubmitContactRequest() {
  return useMutation({
    mutationFn: (input: SubmitContactRequestInput) => ContactRequestService.submit(input),
  });
}

export function useMarkContactRequestResolved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string | null }) =>
      ContactRequestService.markResolved(id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTACT_REQUESTS_QUERY_KEY }),
  });
}

export function useReopenContactRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ContactRequestService.reopen(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTACT_REQUESTS_QUERY_KEY }),
  });
}

export function useDeleteContactRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ContactRequestService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTACT_REQUESTS_QUERY_KEY }),
  });
}