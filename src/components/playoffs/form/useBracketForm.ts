
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useMemo, useCallback } from "react";
import { bracketFormSchema, BracketFormValues } from "./BracketFormSchema";
import { Team } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { BRACKET_FORMATS } from "@/constants/brackets";
import { validateTeamIds, validateDivisionId, isValidUUID } from "@/utils/validation";
import { validateBracketFormData, validateTeamSelection, sanitizeBracketFormData } from "@/utils/bracketValidation";

interface UseBracketFormProps {
  teams: Team[];
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
}

export const useBracketForm = ({ teams, onSubmit }: UseBracketFormProps) => {
  const { toast } = useToast();
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Initialize form with enhanced validation
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: "",
      format: BRACKET_FORMATS.SINGLE,
      teams: []
    },
    mode: "onChange" // Enable real-time validation
  });

  // Watch form values for real-time validation
  const watchedValues = form.watch();

  // Group teams by division for easier filtering and display
  const teamsByDivision = useMemo(() => {
    const grouped: Record<string, Team[]> = {};
    
    if (teams && teams.length > 0) {
      teams.forEach(team => {
        // Ensure team has valid data
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
  
  // Real-time form validation
  useEffect(() => {
    const validateForm = () => {
      const sanitizedData = sanitizeBracketFormData(watchedValues);
      const validation = validateBracketFormData(sanitizedData);
      setIsFormValid(validation.isValid);
    };

    validateForm();
  }, [watchedValues]);
  
  // Update teams list whenever `teams` prop changes
  useEffect(() => {
    if (teams && selectedDivision) {
      handleDivisionChange(selectedDivision);
    }
  }, [teams]);
  
  // Enhanced division change handler with better validation
  const handleDivisionChange = useCallback((divisionId: string) => {
    console.log('Division changed to:', divisionId);
    
    // Reset teams selection when division changes
    form.setValue('teams', []);
    
    // Validate division ID before proceeding
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
    
    if (teams.length === 0) {
      setFilteredTeams([]);
      return;
    }
    
    // Filter teams by division with enhanced validation
    const divisionTeams = teams.filter(team => {
      // Skip invalid teams
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
  
  // Enhanced form submission with comprehensive validation
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      console.log("Form submission started with data:", data);
      
      // Sanitize form data first
      const sanitizedData = sanitizeBracketFormData(data);
      console.log("Sanitized data:", sanitizedData);
      
      // Comprehensive validation
      const formValidation = validateBracketFormData(sanitizedData);
      if (!formValidation.isValid) {
        console.error('Form validation failed:', formValidation.errors);
        toast({
          variant: "destructive",
          title: "Form Validation Failed",
          description: formValidation.errors[0]
        });
        return;
      }
      
      // Team selection validation
      const teamValidation = validateTeamSelection(sanitizedData.teams);
      if (!teamValidation.isValid) {
        console.error('Team validation failed:', teamValidation.errors);
        toast({
          variant: "destructive",
          title: "Invalid Team Selection",
          description: teamValidation.errors[0]
        });
        return;
      }
      
      // Verify all selected teams exist in filtered teams
      const availableTeamIds = filteredTeams.map(t => t.id);
      const missingTeams = sanitizedData.teams.filter(teamId => !availableTeamIds.includes(teamId));
      
      if (missingTeams.length > 0) {
        console.error('Selected teams not found in filtered teams:', missingTeams);
        toast({
          variant: "destructive",
          title: "Team Selection Error",
          description: "Some selected teams are no longer available. Please refresh and reselect teams."
        });
        return;
      }
      
      console.log('All validations passed, submitting sanitized data');
      
      // Submit with sanitized data
      await onSubmit(sanitizedData);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        variant: "destructive",
        title: "Bracket Creation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  });
  
  return {
    form,
    filteredTeams,
    selectedDivision,
    teamsByDivision,
    isFormValid,
    handleDivisionChange,
    handleSubmit
  };
};
