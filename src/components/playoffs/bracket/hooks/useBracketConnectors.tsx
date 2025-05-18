import { useMemo } from "react";
import { PlayoffMatch } from "@/types";
import { getBracketConnectorPaths } from "../../BracketUtils";

/**
 * Hook for calculating bracket connector paths
 */
export const useBracketConnectors = (winners: PlayoffMatch[][], losers: PlayoffMatch[][], finals: PlayoffMatch[]) => {
  // Calculate connector paths for each bracket section
  const winnersConnectorPaths = useMemo(() => {
    const flattened = winners.flatMap(round => round);
    return getBracketConnectorPaths(flattened);
  }, [winners]);

  const losersConnectorPaths = useMemo(() => {
    const flattened = losers.flatMap(round => round);
    return getBracketConnectorPaths(flattened);
  }, [losers]);

  // Get connector paths between winners and losers brackets
  const crossConnectorPaths = useMemo(() => {
    // This would need custom logic to connect winners to losers
    // For simplicity, we'll keep this empty for now
    return [];
  }, []);

  // Calculate bracket visualization paths for connectors to finals
  const finalsConnectorPaths = useMemo(() => {
    return getBracketConnectorPaths(finals);
  }, [finals]);

  return {
    winnersConnectorPaths,
    losersConnectorPaths,
    crossConnectorPaths,
    finalsConnectorPaths
  };
};
