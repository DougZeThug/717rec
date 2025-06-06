
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SeasonAccordion from "./SeasonAccordion";
import LoadingState from "@/components/ui/loading-state";
import { Trophy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      console.log('🔍 History: Starting season history query...');
      
      try {
        const { data, error } = await supabase
          .from('seasons')
          .select('id, name, start_date, end_date, is_active')
          .order('start_date', { ascending: false });

        console.log('📊 History: Supabase query completed');
        console.log('📊 History: Raw data received:', data);
        console.log('❌ History: Error (if any):', error);

        if (error) {
          console.error('❌ History: Database error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        console.log(`✅ History: Successfully fetched ${data?.length || 0} seasons`);
        return data as Season[];
      } catch (err) {
        console.error('💥 History: Exception in query function:', err);
        throw err;
      }
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

const HistoryPageContent: React.FC = () => {
  console.log('🎯 History: HistoryPageContent component rendering...');
  
  const { data: seasons, isLoading, error, refetch, isRefetching } = useSeasonHistory();

  console.log('📊 History: Query state:', {
    isLoading,
    isRefetching,
    hasData: !!seasons,
    dataLength: seasons?.length,
    hasError: !!error
  });

  if (isLoading) {
    console.log('⏳ History: Showing loading state');
    return <LoadingState fullscreen message="Loading season history..." size="lg" />;
  }

  if (error) {
    console.error('❌ History: Displaying error state:', error);
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <Trophy className="w-12 h-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Unable to load season history</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <Button 
            onClick={() => refetch()} 
            disabled={isRefetching}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Retrying...' : 'Try Again'}
          </Button>
        </div>
      </div>
    );
  }

  if (!seasons || seasons.length === 0) {
    console.log('📭 History: No seasons found, showing empty state');
    return (
      <div className="text-center py-12">
        <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">
          No seasons available yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Check back once the first season concludes.
        </p>
        <Button 
          onClick={() => refetch()} 
          disabled={isRefetching}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Checking...' : 'Check Again'}
        </Button>
      </div>
    );
  }

  console.log(`✅ History: Rendering ${seasons.length} season accordions`);
  return (
    <div className="space-y-4">
      {seasons.map((season) => {
        console.log(`🎯 History: Rendering season: ${season.name} (${season.id})`);
        return <SeasonAccordion key={season.id} season={season} />;
      })}
    </div>
  );
};

export default HistoryPageContent;
