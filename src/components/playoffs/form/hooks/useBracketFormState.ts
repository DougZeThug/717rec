
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback } from "react";
import { bracketFormSchema, BracketFormValues } from "../BracketFormSchema";
import { BRACKET_FORMATS } from "@/constants/brackets";
import { BracketValidationService } from "@/services/brackets/validation/BracketValidationService";
import { BracketFormData } from "@/services/brackets/types/BracketFormData";

interface UseBracketFormStateProps {
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
}

// Type guard to ensure we have valid form data
const isValidFormData = (data: any): data is BracketFormData => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.title === 'string' &&
    typeof data.divisionId === 'string' &&
    typeof data.format === 'string' &&
    Array.isArray(data.teams)
  );
};

export const useBracketFormState = ({ onSubmit }: UseBracketFormStateProps) => {
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Initialize form with proper default values
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: undefined,
      format: BRACKET_FORMATS.SINGLE,
      teams: []
    },
    mode: "onChange"
  });

  // Real-time validation with type guards
  const validateForm = useCallback((data: unknown) => {
    console.log("Validating form data:", data);
    
    // Convert form data to BracketFormData format for validation
    const formData = data as any;
    const bracketFormData: BracketFormData = {
      title: formData.title || '',
      divisionId: formData.divisionId || '',
      format: formData.format || BRACKET_FORMATS.SINGLE,
      teams: formData.teams || []
    };
    
    // Type guard check
    if (!isValidFormData(bracketFormData)) {
      console.error('Invalid form data structure:', data);
      setIsFormValid(false);
      return { isValid: false, errors: ["Invalid form data structure"] };
    }
    
    // Only validate if we have the required fields
    if (!bracketFormData.title || !bracketFormData.divisionId || !bracketFormData.teams?.length) {
      setIsFormValid(false);
      return { isValid: false, errors: ["Missing required fields"] };
    }
    
    const validation = BracketValidationService.validateForSubmission(bracketFormData);
    console.log("Validation result:", validation);
    setIsFormValid(validation.isValid);
    return validation;
  }, []);

  // Enhanced form submission with better error handling and type guards
  const handleSubmit = form.handleSubmit(async (data) => {
    console.log("Form submission started with data:", data);
    
    // Convert to BracketFormData format
    const bracketFormData: BracketFormData = {
      title: data.title,
      divisionId: data.divisionId || '',
      format: data.format,
      teams: data.teams
    };
    
    // Type guard check for submission
    if (!isValidFormData(bracketFormData)) {
      console.error('Invalid form data for submission:', data);
      throw new Error('Invalid form data structure');
    }
    
    // Sanitize and validate
    const sanitizedData = BracketValidationService.sanitizeFormData(bracketFormData);
    console.log("Sanitized data:", sanitizedData);
    
    const validation = BracketValidationService.validateForSubmission(sanitizedData);
    
    if (!validation.isValid) {
      console.error('Form validation failed:', validation.errors);
      throw new Error(validation.errors[0]);
    }
    
    console.log('Form validation passed, submitting:', sanitizedData);
    await onSubmit(data); // Submit original form data
  });
  
  return {
    form,
    isFormValid,
    validateForm,
    handleSubmit
  };
};
