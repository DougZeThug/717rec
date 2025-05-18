import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTeamData } from "./useTeamData";
import { useBracketData } from "./useBracketData";
import { PlayoffBracket } from "@/types";

export const usePlayoffData = (selectedBracketId: string | null) => {
  const { toast } = useToast();
  const { data: teams, isLoading: teamsLoading } = useTeamData();

  const { data: allBrackets, isLoading: bracketsLoading, refetch: refetchBrackets } = useQuery({
    queryKey: ['brackets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brackets')
        .select('*, divisions(name)');
      
      if (error) throw error;
      
      return data.map(bracket => ({
        id: bracket.id,
        name: bracket.title, // Map title to name for consistency
        division: bracket.divisions?.name || 'Unknown',
        format: bracket.format || 'Single Elimination'
      })) as Partial<PlayoffBracket>[];
    }
  });
  
  const { data: divisions, isLoading: divisionsLoading } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*');
      
      if (error) throw error;
      
      return data.map(div => ({
        id: div.id,
        name: div.name
      }));
    }
  });
  
  const { bracket, isLoading: bracketLoading } = useBracketData(selectedBracketId || undefined);

  const teamsByDivision = useMemo(() => {
    if (!teams) return {};
    
    const grouped = teams.reduce((acc, team) => {
      const division = team.divisionName || "Unassigned";
      if (!acc[division]) {
        acc[division] = [];
      }
      acc[division].push(team);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.keys(grouped).forEach(division => {
      grouped[division].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return grouped;
  }, [teams]);

  const bracketsByDivision = useMemo(() => {
    if (!allBrackets || !divisions) return {};
    
    return (divisions || []).reduce((acc, division) => {
      acc[division.name] = (allBrackets || []).filter(bracket => bracket.division === division.name);
      return acc;
    }, {} as Record<string, Partial<PlayoffBracket>[]>);
  }, [allBrackets, divisions]);

  const handleBracketCreated = () => {
    refetchBrackets();
  };

  const handleTeamDivisionChange = async (teamId: string, newDivisionName: string) => {
    try {
      const { data: divisionData } = await supabase
        .from('divisions')
        .select('id')
        .eq('name', newDivisionName)
        .single();
      
      if (!divisionData) {
        throw new Error('Division not found');
      }
      
      const { error } = await supabase
        .from('teams')
        .update({ division_id: divisionData.id })
        .eq('id', teamId);
        
      if (error) throw error;
      
      toast({
        title: "Division Updated",
        description: `Team division has been updated to ${newDivisionName}.`,
      });
    } catch (error) {
      console.error('Error updating team division:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the team division.",
        variant: "destructive",
      });
    }
  };

  return {
    teams,
    teamsLoading,
    allBrackets, 
    bracketsLoading,
    divisions,
    divisionsLoading,
    bracket,
    bracketLoading,
    teamsByDivision,
    bracketsByDivision,
    handleBracketCreated,
    handleTeamDivisionChange,
    refetchBrackets
  };
};
