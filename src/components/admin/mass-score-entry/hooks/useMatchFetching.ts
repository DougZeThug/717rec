
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MatchWithTeams, FilterState } from "../types";
import { buildMatchQuery } from "../services/matchQueryService";
import { transformDatabaseMatchToMatchWithTeams } from "../utils/matchTransformUtils";

export const useMatchFetching = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchMatches = async (filters: FilterState) => {
    setLoading(true);
    try {
      const query = buildMatchQuery(filters);
      const { data, error } = await query;

      if (error) throw error;

      const formattedMatches: MatchWithTeams[] = (data || []).map(transformDatabaseMatchToMatchWithTeams);

      setLoading(false);
      return formattedMatches;
    } catch (error: any) {
      console.error("Error fetching matches:", error.message);
      toast({
        title: "Error",
        description: `Failed to fetch matches: ${error.message}`,
        variant: "destructive"
      });
      setLoading(false);
      return [];
    }
  };

  return {
    loading,
    fetchMatches
  };
};
