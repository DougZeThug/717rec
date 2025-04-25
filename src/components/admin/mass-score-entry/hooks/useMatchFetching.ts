
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

      // Log raw data type information
      console.log("🔍 Raw matches fetched:", {
        count: data?.length || 0,
        sampleDate: data?.[0]?.date,
        sampleDateType: data?.[0]?.date ? typeof data[0].date : 'undefined'
      });

      const formattedMatches: MatchWithTeams[] = (data || []).map(match => {
        const transformed = transformDatabaseMatchToMatchWithTeams(match);
        
        // Verify date normalization
        console.log(`🔍 Match date verification [${match.id}]:`, {
          originalDate: match.date,
          originalType: typeof match.date,
          transformedDate: transformed.date,
          transformedType: typeof transformed.date,
          isISOString: typeof transformed.date === 'string' && !isNaN(Date.parse(transformed.date))
        });
        
        return transformed;
      });

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
