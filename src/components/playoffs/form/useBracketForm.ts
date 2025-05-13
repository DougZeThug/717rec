
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bracketFormSchema, BracketFormValues } from "./BracketFormSchema";
import { Team } from "@/types";

export function useBracketForm({ 
  teams, 
  onSubmit 
}: { 
  teams: Team[] | undefined; // Make teams possibly undefined for better type safety
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
}) {
  const [teamsByDivision, setTeamsByDivision] = useState<Record<string, Team[]>>({});
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  
  // Initialize the form
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: "",
      format: "Double Elimination",
      teams: [],
      useChallonge: true,
    },
  });
  
  // Group teams by division with validation
  useEffect(() => {
    // Ensure teams is an array before processing
    const safeTeams = Array.isArray(teams) ? teams : [];
    
    // Debug teams data
    console.log("BracketForm - All teams:", safeTeams.length);
    
    const grouped = safeTeams.reduce((acc, team) => {
      // Validate team object and required properties
      if (!team || !team.id || !team.name) {
        console.warn("Skipping invalid team:", team);
        return acc;
      }
      
      // Use division_id consistently
      const divisionId = team.division_id || team.division || null;
      
      if (divisionId) {
        if (!acc[divisionId]) {
          acc[divisionId] = [];
        }
        acc[divisionId].push(team);
      } else {
        // Handle teams without division
        if (!acc['unassigned']) {
          acc['unassigned'] = [];
        }
        acc['unassigned'].push(team);
        console.log(`Team without division: ${team.name} (${team.id})`);
      }
      return acc;
    }, {} as Record<string, Team[]>);
    
    console.log("BracketForm - Teams grouped by division:", Object.keys(grouped).map(divId => ({
      divisionId: divId,
      teamCount: grouped[divId].length,
      teamNames: grouped[divId].map(t => t.name)
    })));
    
    setTeamsByDivision(grouped);
  }, [teams]);
  
  // Handle division change
  const handleDivisionChange = (divisionId: string) => {
    console.log("BracketForm - Division selected:", divisionId);
    setSelectedDivision(divisionId);
    form.setValue("divisionId", divisionId);
    form.setValue("teams", []);
  };
  
  // Get filtered teams based on selected division
  const filteredTeams = selectedDivision && teamsByDivision[selectedDivision] 
    ? teamsByDivision[selectedDivision] 
    : [];
  
  // Debug filtered teams
  console.log("BracketForm - Filtered teams for division", selectedDivision, ":", filteredTeams.map(t => t.name));

  const handleSubmit = form.handleSubmit(onSubmit);

  return {
    form,
    teamsByDivision,
    selectedDivision,
    filteredTeams,
    handleDivisionChange,
    handleSubmit
  };
}
