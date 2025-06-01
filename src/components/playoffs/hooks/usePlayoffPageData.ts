import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayoffData } from "@/hooks/usePlayoffViewModel.compat";
import { useDivisions } from "@/hooks/useDivisions";
import { useBracketData } from "@/hooks/brackets/useBracketData";
import { usePlayoffTeams } from "@/hooks/playoffs/usePlayoffTeams";
import { PlayoffBracket, BracketFormat, BracketState } from "@/utils/playoffs/playoffTypes";
import { BRACKET_FORMATS, BRACKET_STATES } from "@/constants/brackets";
import { getUIErrorMessage, logError, convertErrorToString } from "@/utils/errors";
import { supabase } from "@/integrations/supabase/client";

export interface PlayoffPageData {
  // Auth & permissions
  profile: any;
  isAdmin: boolean;
  
  // Selected bracket state
  selectedBracketId: string | null;
  setSelectedBracketId: (id: string | null) => void;
  
  // Simple error states
  error: string | null;
  divisionsError: string | null;
  bracketsError: string | null;
  
  // Divisions data
  divisions: any[];
  divisionsLoading: boolean;
  availableDivisions: string[];
  
  // All brackets data
  allBrackets: any[];
  bracketsLoading: boolean;
  teamsByDivision: Record<string, any>;
  bracketsByDivision: Record<string, any>;
  typesafeBracketsByDivision: Record<string, PlayoffBracket[]>;
  allBracketsData: PlayoffBracket[];
  handleBracketCreated: () => void;
  handleTeamDivisionChange: (teamId: string, divisionName: string) => Promise<void>;
  refetchBrackets: () => Promise<any>;
  
  // FIXED: Simplified bracket data - this is the key fix
  bracket: any;
  teams: any[];
  teamsLoading: boolean;
  deleteBracket: (bracketId: string, bracketName: string) => Promise<void>;
  
  // Simple loading state
  isLoading: boolean;
}

export function usePlayoffPageData(): PlayoffPageData {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBracketId, setSelectedBracketIdState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin || false;

  // PHASE 3 FIX: Enhanced bracket ID management with cache invalidation
  const setSelectedBracketId = useCallback((id: string | null) => {
    console.log('🎯 PHASE 3 FIX: setSelectedBracketId called with:', id);
    setSelectedBracketIdState(id);
    
    if (id) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('bracket', id);
      setSearchParams(newSearchParams);
      
      // PHASE 3 FIX: Preload bracket data for better UX
      queryClient.prefetchQuery({
        queryKey: ['bracket-data', id],
        staleTime: 1000 * 60 * 2 // 2 minutes
      });
    } else {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('bracket');
      setSearchParams(newSearchParams);
    }
  }, [searchParams, setSearchParams, queryClient]);

  // Handle URL parameters for bracket selection
  useEffect(() => {
    const bracketParam = searchParams.get('bracket');
    if (bracketParam && bracketParam !== selectedBracketId) {
      setSelectedBracketIdState(bracketParam);
    } else if (!bracketParam && selectedBracketId) {
      setSelectedBracketIdState(null);
    }
  }, [searchParams, selectedBracketId]);

  // PHASE 3 FIX: Enhanced bracket data with optimistic updates and error recovery
  const { 
    data: selectedBracket, 
    isLoading: selectedBracketLoading, 
    error: selectedBracketError,
    refetch: refetchSelectedBracket
  } = useBracketData(selectedBracketId);
  
  console.log('🎯 PHASE 3 FIX: usePlayoffPageData bracket data state:', {
    selectedBracketId,
    selectedBracket: selectedBracket ? {
      id: selectedBracket.id,
      name: selectedBracket.name,
      matchesCount: selectedBracket.matches?.length || 0,
      teamsCount: selectedBracket.teams?.length || 0
    } : null,
    selectedBracketLoading,
    selectedBracketError: selectedBracketError?.message
  });
  
  // Teams data
  const { data: teamsData, isLoading: teamsLoading } = usePlayoffTeams();

  // Divisions
  const { 
    divisions, 
    isLoading: divisionsLoading,
    error: divisionsError 
  } = useDivisions();
  
  // Brackets overview data
  const {
    brackets: allBrackets,
    bracketsLoading,
    teamsByDivision,
    bracketsByDivision,
    handleBracketCreated: originalHandleBracketCreated,
    handleTeamDivisionChange,
    refetchBrackets: originalRefetchBrackets,
    error: bracketsDataError
  } = usePlayoffData();
  
  // PHASE 3 FIX: Enhanced delete function with proper cache invalidation
  const deleteBracket = useCallback(async (bracketId: string, bracketName: string) => {
    console.log('🎯 PHASE 3 FIX: Deleting bracket:', bracketId, bracketName);
    
    try {
      const { error } = await supabase
        .from('brackets')
        .delete()
        .eq('id', bracketId);
      
      if (error) {
        throw error;
      }
      
      // PHASE 3 FIX: Comprehensive cache invalidation
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['brackets'] }),
        queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] }),
        queryClient.invalidateQueries({ queryKey: ['playoff-matches', bracketId] }),
        queryClient.removeQueries({ queryKey: ['bracket-data', bracketId] })
      ]);
      
      // If deleted bracket was selected, clear selection
      if (selectedBracketId === bracketId) {
        setSelectedBracketId(null);
      }
      
      console.log('🎯 PHASE 3 FIX: Bracket deleted successfully with cache invalidation');
    } catch (error) {
      console.error('🎯 PHASE 3 FIX: Error deleting bracket:', error);
      const errorMessage = getUIErrorMessage(error, "Failed to delete bracket");
      logError(error, "deleteBracket");
      throw new Error(errorMessage);
    }
  }, [queryClient, selectedBracketId, setSelectedBracketId]);
  
  // PHASE 3 FIX: Enhanced bracket creation handler with comprehensive cache management
  const handleBracketCreated = useCallback(async () => {
    console.log('🎯 PHASE 3 FIX: handleBracketCreated called');
    
    try {
      await originalHandleBracketCreated();
      
      // PHASE 3 FIX: Comprehensive cache invalidation and refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['brackets'] }),
        queryClient.invalidateQueries({ queryKey: ['playoff-data'] }),
        queryClient.invalidateQueries({ queryKey: ['divisions'] }),
        originalRefetchBrackets()
      ]);
      
      console.log('🎯 PHASE 3 FIX: Bracket creation completed with cache refresh');
    } catch (error) {
      console.error('🎯 PHASE 3 FIX: Error in handleBracketCreated:', error);
      const errorMessage = getUIErrorMessage(error, "Failed to create bracket");
      logError(error, "handleBracketCreated");
      setError(errorMessage);
    }
  }, [originalHandleBracketCreated, originalRefetchBrackets, queryClient]);

  // PHASE 3 FIX: Enhanced refetch function with Promise type fix
  const refetchBrackets = useCallback(async () => {
    console.log('🎯 PHASE 3 FIX: refetchBrackets called');
    
    try {
      // PHASE 3 FIX: Handle refetch promises separately to fix type mismatch
      const cacheInvalidationPromises = [
        originalRefetchBrackets(),
        queryClient.invalidateQueries({ queryKey: ['brackets'] }),
        queryClient.invalidateQueries({ queryKey: ['playoff-data'] })
      ];
      
      // Handle selected bracket refetch separately due to type mismatch
      if (selectedBracketId) {
        await Promise.all([
          ...cacheInvalidationPromises,
          queryClient.invalidateQueries({ queryKey: ['bracket-data', selectedBracketId] })
        ]);
        
        // Refetch selected bracket data separately
        await refetchSelectedBracket();
      } else {
        await Promise.all(cacheInvalidationPromises);
      }
      
      console.log('🎯 PHASE 3 FIX: All data refetched successfully');
      return true;
    } catch (error) {
      console.error('🎯 PHASE 3 FIX: Error in refetchBrackets:', error);
      const errorMessage = getUIErrorMessage(error, "Failed to refresh data");
      logError(error, "refetchBrackets");
      setError(errorMessage);
      throw error;
    }
  }, [originalRefetchBrackets, queryClient, selectedBracketId, refetchSelectedBracket]);

  // Simple bracket processing with error recovery
  const typesafeBracketsByDivision: Record<string, PlayoffBracket[]> = {};
  try {
    if (bracketsByDivision) {
      Object.keys(bracketsByDivision).forEach(div => {
        const divisionBrackets = bracketsByDivision[div];
        if (Array.isArray(divisionBrackets)) {
          typesafeBracketsByDivision[div] = divisionBrackets.map(b => ({
            ...b,
            matches: Array.isArray(b.matches) ? b.matches : [],
            id: b.id || crypto.randomUUID(), 
            state: (b.state || BRACKET_STATES.PENDING) as BracketState, 
            format: (b.format || BRACKET_FORMATS.DOUBLE) as BracketFormat 
          }));
        } else {
          typesafeBracketsByDivision[div] = [];
        }
      });
    }
  } catch (err) {
    const errorMessage = getUIErrorMessage(err, "Failed to process bracket data");
    logError(err, "typesafeBracketsByDivision processing");
    setError(errorMessage);
  }

  // Simple loading state
  const isLoading = bracketsLoading || divisionsLoading;
  
  const allBracketsData = (() => {
    try {
      if (!Array.isArray(allBrackets)) {
        return [];
      }
      return allBrackets.map(b => ({
        ...b,
        matches: Array.isArray(b.matches) ? b.matches : [],
        id: b.id || crypto.randomUUID(),
        state: (b.state || BRACKET_STATES.PENDING) as BracketState,
        format: (b.format || BRACKET_FORMATS.DOUBLE) as BracketFormat
      }));
    } catch (err) {
      const errorMessage = getUIErrorMessage(err, "Failed to process all brackets data");
      logError(err, "allBracketsData processing");
      setError(errorMessage);
      return [];
    }
  })();
  
  const availableDivisions = (() => {
    try {
      if (!Array.isArray(divisions)) {
        return [];
      }
      return divisions.map(div => div.name).filter(Boolean);
    } catch (err) {
      const errorMessage = getUIErrorMessage(err, "Failed to process divisions data");
      logError(err, "availableDivisions processing");
      setError(errorMessage);
      return [];
    }
  })();

  // Convert error types to strings
  const finalDivisionsError = convertErrorToString(divisionsError);
  const finalBracketsError = convertErrorToString(bracketsDataError);

  // PHASE 3 FIX: Log the final return object with cache status
  console.log('🎯 PHASE 3 FIX: usePlayoffPageData returning:', {
    selectedBracketId,
    bracket: selectedBracket ? {
      id: selectedBracket.id,
      name: selectedBracket.name,
      matchesCount: selectedBracket.matches?.length || 0
    } : null,
    teamsCount: teamsData?.length || 0,
    isLoading,
    cacheStatus: {
      selectedBracketLoading,
      hasSelectedBracket: !!selectedBracket,
      hasError: !!selectedBracketError
    }
  });

  return {
    // Auth & permissions
    profile,
    isAdmin,
    
    // Selected bracket state
    selectedBracketId,
    setSelectedBracketId,
    
    // Simple error states
    error,
    divisionsError: finalDivisionsError,
    bracketsError: finalBracketsError,
    
    // Divisions data
    divisions: Array.isArray(divisions) ? divisions : [],
    divisionsLoading,
    availableDivisions,
    
    // All brackets data
    allBrackets: Array.isArray(allBrackets) ? allBrackets : [],
    bracketsLoading,
    teamsByDivision: teamsByDivision || {},
    bracketsByDivision: bracketsByDivision || {},
    typesafeBracketsByDivision,
    allBracketsData,
    handleBracketCreated,
    handleTeamDivisionChange,
    refetchBrackets,
    
    // PHASE 3 FIX: Direct bracket data with matches
    bracket: selectedBracket,
    teams: teamsData || [],
    teamsLoading,
    deleteBracket,
    
    // Simple loading state
    isLoading
  };
}
