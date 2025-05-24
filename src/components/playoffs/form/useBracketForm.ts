
import { useEffect } from "react";
import { Team } from "@/types";
import { BracketFormValues } from "./BracketFormSchema";
import { useBracketFormState } from "./hooks/useBracketFormState";
import { useDivisionManagement } from "./hooks/useDivisionManagement";

interface UseBracketFormProps {
  teams: Team[];
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
}

export const useBracketForm = ({ teams, onSubmit }: UseBracketFormProps) => {
  // Form state management
  const {
    form,
    isFormValid,
    validateForm,
    handleSubmit
  } = useBracketFormState({ onSubmit });

  // Division and team management
  const {
    selectedDivision,
    filteredTeams,
    teamsByDivision,
    handleDivisionChange
  } = useDivisionManagement({ teams, form });

  // Watch form values for real-time validation
  const watchedValues = form.watch();

  // Real-time form validation
  useEffect(() => {
    validateForm(watchedValues);
  }, [watchedValues, validateForm]);
  
  // Update teams list when teams prop changes
  useEffect(() => {
    if (teams && selectedDivision) {
      handleDivisionChange(selectedDivision);
    }
  }, [teams, selectedDivision, handleDivisionChange]);
  
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
