
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const useSubmissionState = () => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [failedMatches, setFailedMatches] = useState<string[]>([]);
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const clearErrors = (matchId?: string) => {
    if (matchId) {
      setErrorMessages(prev => {
        const newErrors = {...prev};
        delete newErrors[matchId];
        return newErrors;
      });
      setFailedMatches(prev => prev.filter(id => id !== matchId));
    } else {
      setErrorMessages({});
      setFailedMatches([]);
    }
  };

  const addError = (matchId: string, message: string) => {
    setFailedMatches(prev => [...prev, matchId]);
    setErrorMessages(prev => ({ ...prev, [matchId]: message }));
  };

  return {
    submitting,
    setSubmitting,
    failedMatches,
    setFailedMatches,
    errorMessages,
    setErrorMessages,
    clearErrors,
    addError,
    toast
  };
};
