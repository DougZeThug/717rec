
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback } from "react";
import { bracketFormSchema, BracketFormValues } from "../BracketFormSchema";
import { BRACKET_FORMATS } from "@/constants/brackets";
import { BracketValidationService } from "@/services/brackets/validation/BracketValidationService";

interface UseBracketFormStateProps {
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
}

export const useBracketFormState = ({ onSubmit }: UseBracketFormStateProps) => {
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Initialize form with proper default values (undefined instead of empty strings)
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: undefined, // Keep as undefined to prevent empty string issues
      format: BRACKET_FORMATS.SINGLE,
      teams: []
    },
    mode: "onChange"
  });

  // Real-time validation
  const validateForm = useCallback((data: BracketFormValues) => {
    console.log("Validating form data:", data);
    
    // Explicit check for empty strings in divisionId
    if (data.divisionId === "" || (typeof data.divisionId === 'string' && data.divisionId.trim() === '')) {
      console.error('Empty string detected in divisionId:', data.divisionId);
      setIsFormValid(false);
      return { isValid: false, errors: ["Division cannot be empty"] };
    }
    
    // Only validate if we have the required fields
    if (!data.title || !data.divisionId || !data.teams?.length) {
      setIsFormValid(false);
      return { isValid: false, errors: ["Missing required fields"] };
    }
    
    const validation = BracketValidationService.validateForSubmission(data);
    console.log("Validation result:", validation);
    setIsFormValid(validation.isValid);
    return validation;
  }, []);

  // Enhanced form submission with better error handling
  const handleSubmit = form.handleSubmit(async (data) => {
    console.log("Form submission started with data:", data);
    
    // Explicit check for empty divisionId
    if (!data.divisionId || data.divisionId === '' || data.divisionId.trim() === '') {
      console.error('Division ID is empty, undefined, or whitespace:', data.divisionId);
      throw new Error('Please select a division');
    }
    
    // Check for empty team IDs
    if (data.teams.some(teamId => !teamId || teamId.trim() === '')) {
      console.error('One or more team IDs are empty');
      throw new Error('Invalid team selection detected');
    }
    
    // Additional safety check - ensure we don't have any empty strings before sanitization
    const preValidation = {
      title: data.title,
      divisionId: data.divisionId,
      format: data.format,
      teams: data.teams
    };
    
    console.log('Pre-validation data check:', preValidation);
    
    // Sanitize and validate
    const sanitizedData = BracketValidationService.sanitizeFormData(data);
    console.log("Sanitized data:", sanitizedData);
    
    const validation = BracketValidationService.validateForSubmission(sanitizedData);
    
    if (!validation.isValid) {
      console.error('Form validation failed:', validation.errors);
      throw new Error(validation.errors[0]);
    }
    
    console.log('Form validation passed, submitting:', sanitizedData);
    await onSubmit(sanitizedData);
  });
  
  return {
    form,
    isFormValid,
    validateForm,
    handleSubmit
  };
};
