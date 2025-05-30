
import { useState, useCallback, useMemo } from "react";
import { Team } from "@/types";
import { isValidUUID } from "@/utils/validation";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "../BracketFormSchema";
import { useToast } from "@/hooks/use-toast";

interface UseDivisionManagementProps {
  teams: Team[];
  form: UseFormReturn<BracketFormValues>;
}

export const useDivisionManagement = ({ teams, form }: UseDivisionManagementProps) => {
  const { toast } = useToast();
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);

  // Group teams by division with better error handling
  const teamsByDivision = useMemo(() => {
    const grouped: Record<string, Team[]> = {};
    
    // Safely handle undefined or empty teams array
    if (!teams || !Array.isArray(teams) || teams.length === 0) {
      console.log("No teams available for division grouping");
      return grouped;
    }
    
    try {
      teams.forEach(team => {
        if (!team || !team.id) {
          console.warn('Skipping team with missing data:', team);
          return;
        }
        
        if (!isValidUUID(team.id)) {
          console.warn('Skipping team with invalid ID:', team);
          return;
        }
        
        const divId = team.division_id || team.division || "";
        if (!grouped[divId]) {
          grouped[divId] = [];
        }
        grouped[divId].push(team);
      });
    } catch (error) {
      console.error("Error grouping teams by division:", error);
    }
    
    return grouped;
  }, [teams]);

  // Handle division change with better error handling
  const handleDivisionChange = useCallback((divisionId: string) => {
    console.log('Division change requested:', divisionId);
    
    try {
      // Reset teams selection safely
      if (form && form.setValue) {
        form.setValue('teams', []);
      }
      
      // Validate division ID
      if (!divisionId || divisionId.trim() === '') {
        console.log("Empty division ID provided");
        setSelectedDivision("");
        setFilteredTeams([]);
        if (form && form.setValue) {
          form.setValue('divisionId', '');
        }
        return;
      }
      
      if (divisionId === 'undefined' || divisionId === 'null') {
        console.error('Invalid division ID value:', divisionId);
        toast({
          variant: "destructive",
          title: "Invalid Division",
          description: "Please select a valid division from the list."
        });
        return;
      }
      
      if (!isValidUUID(divisionId)) {
        console.error('Invalid division ID format:', divisionId);
        toast({
          variant: "destructive",
          title: "Invalid Division",
          description: "The selected division has an invalid format. Please refresh and try again."
        });
        return;
      }
      
      setSelectedDivision(divisionId);
      if (form && form.setValue) {
        form.setValue('divisionId', divisionId);
      }
      
      // Filter teams safely
      if (!teams || !Array.isArray(teams)) {
        console.warn("No teams available for filtering");
        setFilteredTeams([]);
        return;
      }
      
      const divisionTeams = teams.filter(team => {
        if (!team || !team.id) {
          console.warn('Skipping team with missing data during filtering:', team);
          return false;
        }
        
        if (!isValidUUID(team.id)) {
          console.warn('Skipping team with invalid ID during filtering:', team);
          return false;
        }
        
        const teamDivisionId = team.division_id || team.division;
        return teamDivisionId === divisionId;
      });
      
      console.log(`Filtered ${divisionTeams.length} valid teams for division ${divisionId}`);
      setFilteredTeams(divisionTeams);
      
    } catch (error) {
      console.error("Error in handleDivisionChange:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while changing divisions. Please try again."
      });
    }
  }, [teams, form, toast]);

  return {
    selectedDivision,
    filteredTeams,
    teamsByDivision,
    handleDivisionChange
  };
};
