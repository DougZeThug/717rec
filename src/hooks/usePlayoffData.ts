
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const usePlayoffData = () => {
  const { toast } = useToast();

  // Improved divisions query - fetch first to ensure we have division data
  const { data: divisions, isLoading: divisionsLoading } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*');
      
      if (error) throw error;
      
      console.log("Fetched divisions:", data);
      return data.map(div => ({
        id: div.id,
        name: div.name
      }));
    }
  });
  
  // Enhanced brackets query with better division mapping
  const { data: allBrackets, isLoading: bracketsLoading, refetch: refetchBrackets } = useQuery({
    queryKey: ['brackets', divisions],
    queryFn: async () => {
      console.log("Fetching brackets with divisions:", divisions);
      
      const { data, error } = await supabase
        .from('brackets')
        .select('*, divisions(id, name)');
      
      if (error) throw error;
      
      // Enhanced mapping with better division handling
      return data.map(bracket => {
        // Find division name from our divisions data
        const divisionName = bracket.division_id && divisions 
          ? divisions.find(d => d.id === bracket.division_id)?.name || 'Unknown'
          : 'Unknown';
        
        return {
          id: bracket.id,
          name: bracket.title,
          divisionId: bracket.division_id,
          division: divisionName,
          format: bracket.format || 'Single Elimination'
        };
      });
    },
    enabled: !!divisions // Only run after divisions are loaded
  });

  // Query for teams
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*');
        
      if (error) throw error;
      return data;
    }
  });

  // Improved team grouping by division
  const teamsByDivision = useMemo(() => {
    if (!teams || !divisions) return {};
    
    // Initialize with all known divisions
    const grouped: Record<string, any[]> = {};
    divisions.forEach(div => {
      grouped[div.name] = [];
    });
    
    // Add "Unassigned" category
    grouped["Unassigned"] = [];
    
    // Sort teams into appropriate divisions
    teams.forEach(team => {
      if (!team.division && !team.divisionName) {
        grouped["Unassigned"].push(team);
      } else {
        // Find division name from ID if needed
        const divisionId = team.division || team.division_id;
        let divisionName = team.divisionName;
        
        if (!divisionName && divisionId) {
          const division = divisions.find(d => d.id === divisionId);
          divisionName = division ? division.name : "Unknown";
        }
        
        if (divisionName) {
          if (!grouped[divisionName]) {
            grouped[divisionName] = [];
          }
          grouped[divisionName].push(team);
        } else {
          grouped["Unassigned"].push(team);
        }
      }
    });
    
    // Sort teams alphabetically within each division
    Object.keys(grouped).forEach(division => {
      grouped[division].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return grouped;
  }, [teams, divisions]);

  // Improved bracket grouping by division
  const bracketsByDivision = useMemo(() => {
    if (!allBrackets || !divisions) return {};
    
    const grouped: Record<string, any[]> = {};
    divisions.forEach(division => {
      grouped[division.name] = [];
    });
    
    // Group brackets by division name (not ID)
    (allBrackets || []).forEach(bracket => {
      if (bracket.division) {
        if (!grouped[bracket.division]) {
          grouped[bracket.division] = [];
        }
        grouped[bracket.division].push(bracket);
      }
    });
    
    return grouped;
  }, [allBrackets, divisions]);

  const handleBracketCreated = () => {
    refetchBrackets();
  };

  const handleTeamDivisionChange = async (teamId: string, newDivisionName: string) => {
    try {
      // Handle the case when assigning to "Unassigned"
      if (newDivisionName === "Unassigned") {
        const { error } = await supabase
          .from('teams')
          .update({ division_id: null })
          .eq('id', teamId);
          
        if (error) throw error;
        
        toast({
          title: "Division Updated",
          description: `Team has been removed from all divisions.`,
        });
        return;
      }
      
      // Find the division ID from the name
      const division = divisions?.find(div => div.name === newDivisionName);
      if (!division) {
        throw new Error('Division not found');
      }
      
      // Update the team with the correct division ID
      const { error } = await supabase
        .from('teams')
        .update({ division_id: division.id })
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
    teamsByDivision,
    bracketsByDivision,
    handleBracketCreated,
    handleTeamDivisionChange,
    refetchBrackets
  };
};
