
import { useMutation } from "@tanstack/react-query";
import { createBracket } from "@/services/bracket-creator";
import { reportMatch, resyncMatches } from "@/services/bracket-manager";
import type { BracketCreationOptions } from "@/services/bracket-creator";
import type { BracketRecord } from "@/types/bracketRecord";
import type { MatchReportOptions, MatchResyncOptions } from "@/services/bracket-manager";

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

  const reportMatchMutation = useMutation({
    mutationFn: async (options: MatchReportOptions) => {
      return await reportMatch(options);
    },
    onSuccess: () => {
      console.log("Match reported successfully");
    },
    onError: (error) => {
      console.error("Failed to report match:", error);
    }
  });

  const resyncMatchesMutation = useMutation({
    mutationFn: async (options: MatchResyncOptions) => {
      return await resyncMatches(options);
    },
    onSuccess: () => {
      console.log("Matches resynced successfully");
    },
    onError: (error) => {
      console.error("Failed to resync matches:", error);
    }
  });

  return {
    createBracket: createBracketMutation,
    reportMatch: reportMatchMutation,
    resyncMatches: resyncMatchesMutation,
  };
};
