import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Match } from '@/types';
import { transformDatabaseMatches } from '@/utils/matchTransformers';
import { useMatchScoresState } from './matches/useMatchScoresState';
import { useMatchSubmission } from './matches/useMatchSubmission';
import { useTeamsMap } from './teams';
import { errorLog } from "@/utils/logger";

export function useUncompletedMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { scores, initializeScores, handleScoreChange } = useMatchScoresState(matches);
  const { handleSubmitScore } = useMatchSubmission();
  const { teams, refetch: fetchTeams } = useTeamsMap();

  useEffect(() => {
    fetchUncompletedMatches();
    fetchTeams();
  }, []);

  const fetchUncompletedMatches = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('iscompleted', false)
        .order('date');

      if (error) throw error;
      
      const transformedMatches = transformDatabaseMatches(data || []);
      setMatches(transformedMatches);
      initializeScores(transformedMatches);
    } catch (error) {
      errorLog('Error fetching uncompleted matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load matches. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return {
    matches,
    teams,
    isLoading,
    openItems,
    scores,
    toggleItem,
    handleScoreChange,
    handleSubmitScore
  };
}
