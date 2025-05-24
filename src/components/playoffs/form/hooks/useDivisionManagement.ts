
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

  // Group teams by division
  const teamsByDivision = useMemo(() => {
    const grouped: Record<string, Team[]> = {};
    
    if (teams && teams.length > 0) {
      teams.forEach(team => {
        if (!team || !team.id || !isValidUUID(team.id)) {
          console.warn('Skipping invalid team:', team);
          return;
        }
        
        const divId = team.division_id || team.division || "";
        if (!grouped[divId]) {
          grouped[divId] = [];
        }
        grouped[divId].push(team);
      });
    }
    
    return grouped;
  }, [teams]);

  // Handle division change
  const handleDivisionChange = useCallback((divisionId: string) => {
    console.log('Division changed to:', divisionId);
    
    // Reset teams selection
    form.setValue('teams', []);
    
    // Validate division ID
    if (!divisionId || divisionId.trim() === '') {
      setSelectedDivision("");
      setFilteredTeams([]);
      form.setValue('divisionId', '');
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
    form.setValue('divisionId', divisionId);
    
    // Filter teams
    const divisionTeams = teams.filter(team => {
      if (!team || !team.id || !isValidUUID(team.id)) {
        console.warn('Skipping team with invalid ID:', team);
        return false;
      }
      
      const teamDivisionId = team.division_id || team.division;
      return teamDivisionId === divisionId;
    });
    
    console.log(`Filtered ${divisionTeams.length} valid teams for division ${divisionId}`);
    setFilteredTeams(divisionTeams);
  }, [teams, form, toast]);

  return {
    selectedDivision,
    filteredTeams,
    teamsByDivision,
    handleDivisionChange
  };
};
