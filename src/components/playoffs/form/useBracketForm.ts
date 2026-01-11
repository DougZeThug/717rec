import { useEffect } from 'react';

import { Team } from '@/types';

import { BracketFormValues } from './BracketFormSchema';
import { useBracketFormState } from './hooks/useBracketFormState';

interface UseBracketFormProps {
  teams: Team[];
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
}

export const useBracketForm = ({ teams, onSubmit }: UseBracketFormProps) => {
  // Form state management
  const { form, isFormValid, validateForm, handleSubmit } = useBracketFormState({ onSubmit });

  // Watch form values for real-time validation
  const watchedValues = form.watch();

  // Real-time form validation
  useEffect(() => {
    validateForm(watchedValues);
  }, [watchedValues, validateForm]);

  return {
    form,
    isFormValid,
    handleSubmit,
  };
};
