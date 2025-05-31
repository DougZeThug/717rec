
import { useMutation } from "@tanstack/react-query";
import { createBracket } from "@/services/bracket-creator";
import type { BracketCreationOptions } from "@/services/bracket-creator";
import type { BracketRecord } from "@/types/bracketRecord";

export const useChallongeAdmin = () => {
  const createBracketMutation = useMutation({
    mutationFn: async (options: BracketCreationOptions): Promise<BracketRecord> => {
      return await createBracket(options);
    },
    onSuccess: (bracket) => {
      console.log("Bracket created successfully:", bracket);
    },
    onError: (error) => {
      console.error("Failed to create bracket:", error);
    }
  });

  return {
    createBracket: createBracketMutation,
  };
};
