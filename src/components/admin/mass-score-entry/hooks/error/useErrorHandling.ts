
import { useState } from "react";

export const useErrorHandling = () => {
  const [failedMatches, setFailedMatches] = useState<string[]>([]);
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});

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
    setFailedMatches(prev => [...new Set([...prev, matchId])]);
    setErrorMessages(prev => ({ ...prev, [matchId]: message }));
  };

  return {
    failedMatches,
    errorMessages,
    clearErrors,
    addError,
    setFailedMatches,
    setErrorMessages
  };
};
