import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/types";
import { transformDatabaseMatches } from "@/utils/matchTransformers";
import { errorLog } from "@/utils/logger";

export const useMatches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .order('date', { ascending: false });

        if (error) {
          throw error;
        }

        const formattedMatches = transformDatabaseMatches(data, { normalizeDate: false });
        setMatches(formattedMatches);
      } catch (err) {
        errorLog("Error fetching matches:", err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, []);

  return { matches, isLoading, error };
};
