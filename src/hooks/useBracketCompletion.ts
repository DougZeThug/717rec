import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { bracketManagerService } from '@/services/brackets/manager';
import { useToast } from '@/hooks/use-toast';
import { log, errorLog } from '@/utils/logger';

export function useBracketCompletion(bracketId: string | undefined) {
  const { toast } = useToast();
  
  log('🔔 useBracketCompletion hook called', { bracketId });

  useEffect(() => {
    if (!bracketId) return;
    
    log('🔔 useBracketCompletion effect running', { bracketId });

    // Subscribe to bracket state changes
    const channel = supabase
      .channel(`bracket-${bracketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'brackets',
          filter: `id=eq.${bracketId}`
        },
        async (payload) => {
          const bracket = payload.new as any;
          
          // If bracket just completed, calculate final standings
          if (bracket.state === 'completed' && bracket.uses_brackets_manager) {
            try {
              await bracketManagerService.calculateFinalStandings(bracketId);
              
              toast({
                title: "Tournament Complete!",
                description: "Final standings have been calculated.",
              });
            } catch (error) {
              errorLog("Failed to calculate final standings:", error);
              toast({
                title: "Standings Calculation Failed",
                description: "Could not calculate final placements. Please refresh.",
                variant: "destructive"
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [bracketId, toast]);
}
