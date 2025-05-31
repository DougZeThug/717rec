
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

  // Type-safe validation using Zod safeParse
  const validateForm = useCallback((data: unknown) => {
    console.log("Validating form data:", data);
    
    try {
      // Safely handle undefined or null data
      if (!data || typeof data !== 'object') {
        console.log("No data provided for validation");
        setIsFormValid(false);
        return { isValid: false, errors: ["No form data"] };
      }
      
      // Use Zod safeParse instead of casting
      const parseResult = bracketFormSchema.safeParse(data);
      
      if (!parseResult.success) {
        console.log('Form data validation failed:', parseResult.error.format());
        setIsFormValid(false);
        return { 
          isValid: false, 
          errors: parseResult.error.issues.map(issue => issue.message) 
        };
      }
      
      const formData = parseResult.data;
      
      // Only validate if we have the required fields - don't error on empty forms
      if (!formData.title && !formData.divisionId && !formData.teams?.length) {
        console.log("Form is empty, validation not needed yet");
        setIsFormValid(false);
        return { isValid: false, errors: ["Form is empty"] };
      }
      
      // Only validate if we have some content to validate
      if (formData.title || formData.divisionId || formData.teams?.length) {
        // Convert to BracketFormData format for validation service
        const bracketFormData: BracketFormData = {
          title: formData.title,
          divisionId: formData.divisionId,
          format: formData.format,
          teams: formData.teams
        };
        
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

  // Enhanced form submission with type-safe parsing
  const handleSubmit = form.handleSubmit(async (data) => {
    console.log("Form submission started with data:", data);
    
    try {
      // Validate with Zod before submission
      const parseResult = bracketFormSchema.safeParse(data);
      
      if (!parseResult.success) {
        console.error('Form submission validation failed:', parseResult.error.format());
        throw new Error('Invalid form data structure');
      }
      
      const validatedData = parseResult.data;
      
      // Convert to BracketFormData format for service validation
      const bracketFormData: BracketFormData = {
        title: validatedData.title,
        divisionId: validatedData.divisionId,
        format: validatedData.format,
        teams: validatedData.teams
      };
      
      // Sanitize and validate
      const sanitizedData = BracketValidationService.sanitizeFormData(bracketFormData);
      console.log("Sanitized data:", sanitizedData);
      
      const validation = BracketValidationService.validateForSubmission(sanitizedData);
      
      if (!validation.isValid) {
        console.error('Form validation failed:', validation.errors);
        throw new Error(validation.errors[0]);
      }
      
      console.log('Form validation passed, submitting:', validatedData);
      await onSubmit(validatedData); // Submit validated form data
      
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
