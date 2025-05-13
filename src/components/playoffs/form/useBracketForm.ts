
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bracketFormSchema, BracketFormValues } from "./BracketFormSchema";
import { Team } from "@/types";

export function useBracketForm({ 
  teams, 
  onSubmit 
}: { 
  teams: Team[]; 
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
  
  // Group teams by division
  useEffect(() => {
    // Debug teams data
    console.log("BracketForm - All teams:", teams.map(t => ({
      id: t.id,
      name: t.name,
      division_id: t.division_id,
      division: t.division
    })));
    
    const grouped = teams.reduce((acc, team) => {
      // Use division_id consistently
      const divisionId = team.division_id || team.division || null;
      
      if (divisionId) {
        if (!acc[divisionId]) {
          acc[divisionId] = [];
        }
        acc[divisionId].push(team);
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
  const filteredTeams = selectedDivision ? teamsByDivision[selectedDivision] || [] : [];
  
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
