
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Match, Team } from '@/types';
import { transformMatchData } from '@/utils/matchDataTransformer';
import { useMatchScoresState } from './matches/useMatchScoresState';
import { useMatchSubmission } from './matches/useMatchSubmission';

export function useUncompletedMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { scores, initializeScores, handleScoreChange } = useMatchScoresState(matches);
  const { handleSubmitScore } = useMatchSubmission();

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
      
      const transformedMatches = (data || []).map(transformMatchData);
      setMatches(transformedMatches);
      initializeScores(transformedMatches);
    } catch (error) {
      console.error('Error fetching uncompleted matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load matches. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*');

      if (error) throw error;
      
      const teamsMap: Record<string, Team> = {};
      data?.forEach(team => {
        teamsMap[team.id] = {
          id: team.id,
          name: team.name,
          logoUrl: team.logo_url,
          imageUrl: team.image_url,
          players: Array.isArray(team.players) 
            ? team.players.map((playerName: string) => ({ name: playerName })) 
            : [],
          wins: team.wins || 0,
          losses: team.losses || 0,
          created_at: team.created_at || '',
          division: team.division_id || null,
          divisionName: null
        };
      });
      
      setTeams(teamsMap);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams. Please try again.',
        variant: 'destructive',
      });
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
