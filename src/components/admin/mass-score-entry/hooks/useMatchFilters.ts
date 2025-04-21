
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilterState } from "../types";

export const useMatchFilters = () => {
  const [filters, setFilters] = useState<FilterState>({});
  const [brackets, setBrackets] = useState<{ id: string; title: string }[]>([]);

  const fetchBrackets = async () => {
    try {
      const { data, error } = await supabase
        .from('brackets')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setBrackets(data || []);
    } catch (error: any) {
      console.error("Error fetching brackets:", error.message);
    }
  };

  const setFilterDate = (date?: Date) => {
    setFilters(prev => ({ ...prev, date }));
  };

  const setBracketFilter = (bracketId?: string) => {
    // Handle the "all" value specially
    if (bracketId === "all") {
      setFilters(prev => {
        const { bracketId: _, ...rest } = prev;
        return rest;
      });
    } else {
      setFilters(prev => ({ ...prev, bracketId }));
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  return {
    filters,
    brackets,
    fetchBrackets,
    setFilterDate,
    setBracketFilter,
    clearFilters
  };
};
