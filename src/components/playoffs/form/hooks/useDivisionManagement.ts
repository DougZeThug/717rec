
import { useState, useEffect, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { Team } from "@/types";
import { BracketFormValues } from "../BracketFormSchema";

interface UseDivisionManagementProps {
  teams: Team[];
  form: UseFormReturn<BracketFormValues>;
}

export const useDivisionManagement = ({ teams, form }: UseDivisionManagementProps) => {
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  // Group teams by division using consistent property names
  const teamsByDivision = useMemo(() => {
    if (!Array.isArray(teams)) return {};
    
    const grouped: Record<string, Team[]> = {};
    
    teams.forEach(team => {
      // Check both division_id and division for compatibility
      const divisionId = team.division_id || team.division;
      if (divisionId) {
        if (!grouped[divisionId]) {
          grouped[divisionId] = [];
        }
        grouped[divisionId].push(team);
      }
    });
    
    console.log('useDivisionManagement - Teams grouped by division:', Object.keys(grouped).map(divId => ({
      divisionId: divId,
      teamCount: grouped[divId].length,
      sampleTeam: grouped[divId][0] ? {
        name: grouped[divId][0].name,
        division_id: grouped[divId][0].division_id,
        wins: grouped[divId][0].wins,
        losses: grouped[divId][0].losses
      } : null
    })));
    
    return grouped;
  }, [teams]);

  // Get filtered teams for the selected division
  const filteredTeams = useMemo(() => {
    if (!selectedDivision) return [];
    
    const teamsForDivision = teamsByDivision[selectedDivision] || [];
    console.log(`Filtered teams for division ${selectedDivision}:`, teamsForDivision.map(t => ({
      name: t.name,
      id: t.id,
      wins: t.wins,
      losses: t.losses,
      division_id: t.division_id
    })));
    
    return teamsForDivision;
  }, [selectedDivision, teamsByDivision]);

  // Handle division change
  const handleDivisionChange = (divisionId: string) => {
    console.log('Division changed to:', divisionId);
    setSelectedDivision(divisionId);
    
    // Clear team selection when division changes
    form.setValue('teams', []);
    
    // Trigger form validation
    form.trigger('divisionId');
  };

  // Watch for division changes from the form
  const formDivisionId = form.watch('divisionId');
  
  useEffect(() => {
    if (formDivisionId && formDivisionId !== selectedDivision) {
      setSelectedDivision(formDivisionId);
    }
  }, [formDivisionId, selectedDivision]);

  return {
    selectedDivision,
    filteredTeams,
    teamsByDivision,
    handleDivisionChange
  };
};
