
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
  
  // Initialize form with enhanced validation
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: "",
      format: BRACKET_FORMATS.SINGLE,
      teams: []
    },
    mode: "onChange"
  });

  // Real-time validation
  const validateForm = useCallback((data: BracketFormValues) => {
    const validation = BracketValidationService.validateForSubmission(data);
    setIsFormValid(validation.isValid);
    return validation;
  }, []);

  // Enhanced form submission
  const handleSubmit = form.handleSubmit(async (data) => {
    console.log("Form submission started with data:", data);
    
    // Sanitize and validate
    const sanitizedData = BracketValidationService.sanitizeFormData(data);
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
