import { useState } from "react";
import { FilterState } from "../../types";
import { supabase } from "@/integrations/supabase/client";
import { filterLog, errorLog } from "@/utils/logger";

export const useFiltersState = () => {
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
    console.log("Setting filter date:", date);
    setFilters(prev => ({ ...prev, date }));
  };

  const setBracketFilter = (bracketId?: string) => {
    setFilters(prev => ({ ...prev, bracketId }));
  };

  const clearFilters = () => {
    console.log("Clearing all filters");
    setFilters({});
  };

  // New function to update filters for specific match dates
  const updateFiltersForMatchDate = (matchDate: Date) => {
    if (!filters.date || filters.date.getTime() !== matchDate.getTime()) {
      console.log("Auto-updating filter date to match newly created match:", matchDate);
      setFilterDate(matchDate);
    }
  };

  return {
    filters,
    brackets,
    fetchBrackets,
    setFilterDate,
    setBracketFilter,
    clearFilters,
    updateFiltersForMatchDate
  };
};
