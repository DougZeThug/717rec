
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useMemo } from "react";
import { bracketFormSchema, BracketFormValues } from "./BracketFormSchema";
import { Team } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { BRACKET_FORMATS } from "@/constants/brackets";

interface UseBracketFormProps {
  teams: Team[];
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
}

export const useBracketForm = ({ teams, onSubmit }: UseBracketFormProps) => {
  const { toast } = useToast();
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  
  // Initialize form with zod schema validation
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: "",
      format: BRACKET_FORMATS.SINGLE,
      teams: []
    }
  });

  // Group teams by division for easier filtering and display
  const teamsByDivision = useMemo(() => {
    const grouped: Record<string, Team[]> = {};
    
    if (teams && teams.length > 0) {
      teams.forEach(team => {
        const divId = team.division_id || team.division || "";
        if (!grouped[divId]) {
          grouped[divId] = [];
        }
        grouped[divId].push(team);
      });
    }
    
    return grouped;
  }, [teams]);
  
  // Update teams list whenever `teams` prop changes
  useEffect(() => {
    if (teams && selectedDivision) {
      handleDivisionChange(selectedDivision);
    }
  }, [teams]);
  
  // Filter teams by selected division
  const handleDivisionChange = (divisionId: string) => {
    setSelectedDivision(divisionId);
    form.setValue('divisionId', divisionId);
    
    if (!divisionId || teams.length === 0) {
      setFilteredTeams([]);
      return;
    }
    
    if (divisionId) {
      // Fix: Explicitly check for both division_id and division fields
      const divisionTeams = teams.filter(team => 
        team.division_id === divisionId || team.division === divisionId
      );
      console.log(`Filtered teams for division ${divisionId}:`, divisionTeams);
      setFilteredTeams(divisionTeams);
      
      // Clear previously selected teams when division changes
      form.setValue('teams', []);
    }
  };
  
  // Handle form submission with improved error handling
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      console.log("Form submission data:", data);
      
      // Additional validation
      if (!data.divisionId || data.divisionId === 'undefined') {
        toast({
          variant: "destructive", 
          title: "Division Required", 
          description: "Please select a valid division"
        });
        return;
      }
      
      if (!data.teams || data.teams.length < 2) {
        toast({
          variant: "destructive", 
          title: "Teams Required", 
          description: "Please select at least 2 teams"
        });
        return;
      }
      
      // Submit the form data
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        variant: "destructive",
        title: "Bracket Creation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  });
  
  return {
    form,
    filteredTeams,
    selectedDivision,
    teamsByDivision,
    handleDivisionChange,
    handleSubmit
  };
};
