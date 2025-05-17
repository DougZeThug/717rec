
import { useState } from "react";

export const useQuickScoreState = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  return {
    isSubmitting,
    setIsSubmitting,
    selectedOption,
    setSelectedOption
  };
};
