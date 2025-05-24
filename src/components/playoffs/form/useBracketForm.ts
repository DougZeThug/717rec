
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useMemo } from "react";
import { bracketFormSchema, BracketFormValues } from "./BracketFormSchema";
import { Team } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { BRACKET_FORMATS } from "@/constants/brackets";
import { validateTeamIds, validateDivisionId, isValidUUID } from "@/utils/validation";

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
  
  // Filter teams by selected division with enhanced validation
  const handleDivisionChange = (divisionId: string) => {
    console.log('Division changed to:', divisionId);
    
    // Validate division ID before proceeding
    if (divisionId && !isValidUUID(divisionId)) {
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
    
    if (!divisionId || teams.length === 0) {
      setFilteredTeams([]);
      return;
    }
    
    if (divisionId) {
      // Explicitly check for both division_id and division fields
      const divisionTeams = teams.filter(team => {
        const teamDivisionId = team.division_id || team.division;
        return teamDivisionId === divisionId;
      });
      
      // Validate that all filtered teams have valid IDs
      const validTeams = divisionTeams.filter(team => {
        if (!team.id || !isValidUUID(team.id)) {
          console.warn(`Team ${team.name} has invalid ID: ${team.id}`);
          return false;
        }
        return true;
      });
      
      if (validTeams.length !== divisionTeams.length) {
        const invalidCount = divisionTeams.length - validTeams.length;
        toast({
          variant: "destructive",
          title: "Invalid Team Data",
          description: `${invalidCount} team(s) have invalid IDs and were excluded. Please contact an administrator.`
        });
      }
      
      console.log(`Filtered teams for division ${divisionId}:`, validTeams.map(t => ({ id: t.id, name: t.name })));
      setFilteredTeams(validTeams);
      
      // Clear previously selected teams when division changes
      form.setValue('teams', []);
    }
  };
  
  // Enhanced form submission with comprehensive validation
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      console.log("Form submission data:", data);
      
      // Step 1: Validate title
      if (!data.title?.trim()) {
        toast({
          variant: "destructive", 
          title: "Title Required", 
          description: "Please provide a title for the bracket"
        });
        return;
      }
      
      // Step 2: Validate division ID
      if (!data.divisionId?.trim()) {
        toast({
          variant: "destructive", 
          title: "Division Required", 
          description: "Please select a division for the bracket"
        });
        return;
      }
      
      const divisionValidation = validateDivisionId(data.divisionId);
      if (!divisionValidation.isValid) {
        console.error('Division validation failed:', divisionValidation.error);
        toast({
          variant: "destructive", 
          title: "Invalid Division", 
          description: divisionValidation.error
        });
        return;
      }
      
      // Step 3: Validate teams array
      if (!data.teams || data.teams.length === 0) {
        toast({
          variant: "destructive", 
          title: "No Teams Selected", 
          description: "Please select at least 2 teams for the bracket"
        });
        return;
      }
      
      if (data.teams.length < 2) {
        toast({
          variant: "destructive", 
          title: "Insufficient Teams", 
          description: "Please select at least 2 teams"
        });
        return;
      }
      
      // Step 4: Comprehensive team ID validation
      const teamValidation = validateTeamIds(data.teams);
      if (!teamValidation.isValid) {
        console.error('Team validation failed:', teamValidation.errors);
        toast({
          variant: "destructive", 
          title: "Invalid Teams", 
          description: teamValidation.errors.join(', ')
        });
        return;
      }
      
      // Step 5: Additional safety checks - ensure no empty strings or invalid UUIDs
      const invalidTeams = data.teams.filter(teamId => 
        !teamId || 
        typeof teamId !== 'string' || 
        teamId.trim() === '' || 
        teamId === 'undefined' || 
        teamId === 'null' ||
        !isValidUUID(teamId)
      );
      
      if (invalidTeams.length > 0) {
        console.error('Found invalid team IDs:', invalidTeams);
        toast({
          variant: "destructive", 
          title: "Invalid Team Selection", 
          description: `${invalidTeams.length} team(s) have invalid IDs. Please refresh and try again.`
        });
        return;
      }
      
      // Step 6: Verify all selected teams exist in filtered teams
      const availableTeamIds = filteredTeams.map(t => t.id);
      const missingTeams = data.teams.filter(teamId => !availableTeamIds.includes(teamId));
      
      if (missingTeams.length > 0) {
        console.error('Selected teams not found in filtered teams:', missingTeams);
        toast({
          variant: "destructive", 
          title: "Team Selection Error", 
          description: "Some selected teams are no longer available. Please refresh and reselect teams."
        });
        return;
      }
      
      console.log('All validations passed, submitting form with validated data:', {
        title: data.title,
        divisionId: data.divisionId,
        format: data.format,
        teamCount: data.teams.length,
        validatedTeamIds: data.teams
      });
      
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
