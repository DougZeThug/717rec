
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export const useAuthError = () => {
  const [authError, setAuthError] = useState<string | null>(null);

  // Clear authentication error
  const clearAuthError = () => {
    setAuthError(null);
  };

  // Handle authentication errors
  const handleAuthError = (error: Error, context: string) => {
    const errorMessage = error.message || `An error occurred during ${context}`;
    setAuthError(errorMessage);
    console.error(`Error during ${context}:`, error);
    
    // Also show a toast for immediate feedback
    toast({
      title: `${context} failed`,
      description: errorMessage,
      variant: "destructive",
    });
    
    return errorMessage;
  };

  return {
    authError,
    setAuthError,
    clearAuthError,
    handleAuthError
  };
};
