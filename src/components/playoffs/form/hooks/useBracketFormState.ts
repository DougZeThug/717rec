
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
  
  // Initialize form with proper default values and less aggressive validation
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: "",
      format: BRACKET_FORMATS.SINGLE,
      teams: []
    },
    mode: "onSubmit" // Changed from "onChange" to prevent premature validation
  });

  // More defensive validation that won't crash on undefined values
  const validateForm = useCallback((data: unknown) => {
    console.log("Validating form data:", data);
    
    try {
      // Safely handle undefined or null data
      if (!data || typeof data !== 'object') {
        console.log("No data provided for validation");
        setIsFormValid(false);
        return { isValid: false, errors: ["No form data"] };
      }
      
      // Convert form data to BracketFormData format for validation
      const formData = data as any;
      const bracketFormData: BracketFormData = {
        title: formData.title || '',
        divisionId: formData.divisionId || '',
        format: formData.format || BRACKET_FORMATS.SINGLE,
        teams: Array.isArray(formData.teams) ? formData.teams : []
      };
      
      // Type guard check
      if (!isValidFormData(bracketFormData)) {
        console.log('Form data structure is not yet complete');
        setIsFormValid(false);
        return { isValid: false, errors: ["Form not ready"] };
      }
      
      // Only validate if we have the required fields - don't error on empty forms
      if (!bracketFormData.title && !bracketFormData.divisionId && !bracketFormData.teams?.length) {
        console.log("Form is empty, validation not needed yet");
        setIsFormValid(false);
        return { isValid: false, errors: ["Form is empty"] };
      }
      
      // Only validate if we have some content to validate
      if (bracketFormData.title || bracketFormData.divisionId || bracketFormData.teams?.length) {
        const validation = BracketValidationService.validateForSubmission(bracketFormData);
        console.log("Validation result:", validation);
        setIsFormValid(validation.isValid);
        return validation;
      }
      
      // Default case - form is not ready
      setIsFormValid(false);
      return { isValid: false, errors: ["Form not ready"] };
      
    } catch (error) {
      console.error("Error during form validation:", error);
      setIsFormValid(false);
      return { isValid: false, errors: ["Validation error"] };
    }
  }, []);

  // Enhanced form submission with better error handling and type guards
  const handleSubmit = form.handleSubmit(async (data) => {
    console.log("Form submission started with data:", data);
    
    try {
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
      
    } catch (error) {
      console.error("Error during form submission:", error);
      throw error; // Re-throw to be handled by the calling component
    }
  });
  
  return {
    form,
    isFormValid,
    validateForm,
    handleSubmit
  };
};
