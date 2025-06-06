
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SeasonAccordion from "./SeasonAccordion";
import LoadingState from "@/components/ui/loading-state";
import { Trophy } from "lucide-react";

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

const useSeasonHistory = () => {
  return useQuery({
    queryKey: ['season-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, start_date, end_date, is_active')
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching seasons:', error);
        throw error;
      }

      return data as Season[];
    },
  });
};

const HistoryPageContent: React.FC = () => {
  const { data: seasons, isLoading, error } = useSeasonHistory();

  if (isLoading) {
    return <LoadingState fullscreen message="Loading season history..." size="lg" />;
  }

  if (error || !seasons) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <Trophy className="w-12 h-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Unable to load season history</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (seasons.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">
          No seasons available yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Check back once the first season concludes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {seasons.map((season) => (
        <SeasonAccordion key={season.id} season={season} />
      ))}
    </div>
  );
};

export default HistoryPageContent;
