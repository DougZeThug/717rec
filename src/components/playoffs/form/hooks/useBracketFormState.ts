
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback } from "react";
import { bracketFormSchema, BracketFormValues } from "../BracketFormSchema";
import { BRACKET_FORMATS } from "@/constants/brackets";
import { BracketValidationService } from "@/services/brackets/validation/BracketValidationService";
import { BracketFormData } from "@/services/brackets/types/BracketFormData";
import { bracketLog, errorLog, debugLog } from "@/utils/logger";

interface UseBracketFormStateProps {
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
}

export const useBracketFormState = ({ onSubmit }: UseBracketFormStateProps) => {
  const [isFormValid, setIsFormValid] = useState(false);
  
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: "",
      format: BRACKET_FORMATS.SINGLE,
      teams: []
    },
    mode: "onSubmit"
  });

  const validateForm = useCallback((data: unknown) => {
    debugLog("Validating form data:", data);
    
    try {
      if (!data || typeof data !== 'object') {
        debugLog("No data provided for validation");
        setIsFormValid(false);
        return { isValid: false, errors: ["No form data"] };
      }
      
      const parseResult = bracketFormSchema.safeParse(data);
      
      if (!parseResult.success) {
        debugLog('Form data validation failed:', parseResult.error.format());
        setIsFormValid(false);
        return { 
          isValid: false, 
          errors: parseResult.error.issues.map(issue => issue.message) 
        };
      }
      
      const formData = parseResult.data;
      
      if (!formData.title && !formData.divisionId && !formData.teams?.length) {
        debugLog("Form is empty, validation not needed yet");
        setIsFormValid(false);
        return { isValid: false, errors: ["Form is empty"] };
      }
      
      if (formData.title || formData.divisionId || formData.teams?.length) {
        const bracketFormData: BracketFormData = {
          title: formData.title,
          divisionId: formData.divisionId,
          format: formData.format,
          teams: formData.teams
        };
        
        const validation = BracketValidationService.validateForSubmission(bracketFormData);
        bracketLog("Validation result:", validation);
        setIsFormValid(validation.isValid);
        return validation;
      }
      
      setIsFormValid(false);
      return { isValid: false, errors: ["Form not ready"] };
      
    } catch (error) {
      errorLog("Error during form validation:", error);
      setIsFormValid(false);
      return { isValid: false, errors: ["Validation error"] };
    }
  }, []);

  const handleSubmit = form.handleSubmit(async (data) => {
    bracketLog("Form submission started with data:", data);
    
    try {
      const parseResult = bracketFormSchema.safeParse(data);
      
      if (!parseResult.success) {
        errorLog('Form submission validation failed:', parseResult.error.format());
        throw new Error('Invalid form data structure');
      }
      
      const validatedData = parseResult.data;
      
      const bracketFormData: BracketFormData = {
        title: validatedData.title,
        divisionId: validatedData.divisionId,
        format: validatedData.format,
        teams: validatedData.teams
      };
      
      const sanitizedData = BracketValidationService.sanitizeFormData(bracketFormData);
      bracketLog("Sanitized data:", sanitizedData);
      
      const validation = BracketValidationService.validateForSubmission(sanitizedData);
      
      if (!validation.isValid) {
        errorLog('Form validation failed:', validation.errors);
        throw new Error(validation.errors[0]);
      }
      
      bracketLog('Form validation passed, submitting:', validatedData);
      await onSubmit(validatedData);
      
    } catch (error) {
      errorLog("Error during form submission:", error);
      throw error;
    }
  });
  
  return {
    form,
    isFormValid,
    validateForm,
    handleSubmit
  };
};
