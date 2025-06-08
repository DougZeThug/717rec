
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MatchWithTeams, FilterState } from "./types";

export const useScoreEntryData = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [brackets, setBrackets] = useState<{ id: string; title: string }[]>([]);
  const { toast } = useToast();

  // Fetch brackets for filtering
  const fetchBrackets = async () => {
    try {
      const { data, error } = await supabase
        .from('brackets')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setBrackets(data || []);
    } catch (error: any) {
      console.error("Error fetching brackets:", error.message);
    }
  };

  // Main function to fetch matches
  const fetchMatches = async () => {
    setLoading(true);
    let query = supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(id, name, logo_url),
        team2:teams!matches_team2_id_fkey(id, name, logo_url)
      `)
      .order('date', { ascending: true });

    // Apply date filter if selected
    if (filters.date) {
      const dateStr = format(filters.date, 'yyyy-MM-dd');
      query = query.gte('date', `${dateStr}T00:00:00`)
                   .lt('date', `${dateStr}T23:59:59`);
    }

    // Apply bracket filter if selected
    if (filters.bracketId) {
      query = query.eq('bracket_id', filters.bracketId);
    }

    try {
      const { data, error } = await query;
      if (error) throw error;

      const formattedMatches: MatchWithTeams[] = (data || []).map(match => {
        // Convert from database snake_case to our TypeScript camelCase
        return {
          id: match.id,
          team1Id: match.team1_id,
          team2Id: match.team2_id,
          team1Score: match.team1_score,
          team2Score: match.team2_score,
          date: match.date,
          location: match.location,
          iscompleted: match.iscompleted,
          winnerId: match.winner_id,
          loserId: match.loser_id,
          round_number: match.round_number,
          position: match.position,
          bracket_id: match.bracket_id,
          match_type: match.match_type,
          next_match_id: match.next_match_id,
          next_loser_match_id: match.next_loser_match_id,
          best_of: match.best_of,
          created_at: match.created_at,
          // Map the team relation data
          team1: match.team1 ? {
            id: match.team1.id,
            name: match.team1.name,
            logoUrl: match.team1.logo_url,
            players: [],
            wins: 0,
            losses: 0,
            game_wins: 0,
            game_losses: 0,
            created_at: "",
            // Add required Team properties
            sos: 0.5,
            power_score: 0,
            win_percentage: 0,
            game_win_percentage: 0
          } : undefined,
          team2: match.team2 ? {
            id: match.team2.id,
            name: match.team2.name,
            logoUrl: match.team2.logo_url,
            players: [],
            wins: 0,
            losses: 0,
            game_wins: 0,
            game_losses: 0,
            created_at: "",
            // Add required Team properties
            sos: 0.5,
            power_score: 0,
            win_percentage: 0,
            game_win_percentage: 0
          } : undefined,
          isEdited: false,
          isValid: validateMatchScores(match.team1_score, match.team2_score)
        };
      });

      setMatches(formattedMatches);
    } catch (error: any) {
      console.error("Error fetching matches:", error.message);
      toast({
        title: "Error",
        description: `Failed to fetch matches: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to validate scores
  const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
    return Number.isInteger(score1) && Number.isInteger(score2);
  };

  // Handler for score changes
  const handleScoreChange = (index: number, team: 'team1' | 'team2', value: string) => {
    const newMatches = [...matches];
    const scoreValue = value === "" ? null : parseInt(value, 10);
    const match = newMatches[index];
    
    if (team === 'team1') {
      match.team1Score = scoreValue;
    } else {
      match.team2Score = scoreValue;
    }

    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    setMatches(newMatches);
  };

  // Handler for marking matches as completed
  const handleMarkCompleted = (index: number, checked: boolean) => {
    const newMatches = [...matches];
    newMatches[index].iscompleted = checked;
    newMatches[index].isEdited = true;
    setMatches(newMatches);
  };

  // Handler to submit all changes
  const handleSubmitAll = async () => {
    // Get only edited matches
    const editedMatches = matches.filter(match => match.isEdited);
    
    // Check if any match is invalid
    const invalidMatches = editedMatches.filter(match => !match.isValid);
    if (invalidMatches.length > 0) {
      toast({
        title: "Validation Error",
        description: "Some matches have invalid scores. Please ensure all scores are valid numbers.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Process matches one by one to handle winner_id and loser_id
      for (const match of editedMatches) {
        if (match.team1Score !== null && match.team2Score !== null) {
          let winnerId = null;
          let loserId = null;
          
          // Determine winner and loser
          if (match.team1Score > match.team2Score) {
            winnerId = match.team1Id;
            loserId = match.team2Id;
          } else if (match.team2Score > match.team1Score) {
            winnerId = match.team2Id;
            loserId = match.team1Id;
          }

          // Update match in database
          const { error } = await supabase
            .from('matches')
            .update({
              team1_score: match.team1Score,
              team2_score: match.team2Score,
              iscompleted: match.iscompleted,
              winner_id: winnerId,
              loser_id: loserId
            })
            .eq('id', match.id);

          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: `Updated ${editedMatches.length} match results successfully.`,
      });

      // Refresh the matches list
      fetchMatches();
    } catch (error: any) {
      console.error("Error updating matches:", error.message);
      toast({
        title: "Error",
        description: `Failed to update matches: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Update filters
  const setFilterDate = (date?: Date) => {
    setFilters(prev => ({ ...prev, date }));
  };

  const setBracketFilter = (bracketId?: string) => {
    setFilters(prev => ({ ...prev, bracketId }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  // Load data when filters change
  useEffect(() => {
    fetchBrackets();
    fetchMatches();
  }, [filters.date, filters.bracketId]);

  return {
    matches,
    loading,
    submitting,
    brackets,
    filters,
    handleScoreChange,
    handleMarkCompleted,
    handleSubmitAll,
    setFilterDate,
    setBracketFilter,
    clearFilters
  };
};
