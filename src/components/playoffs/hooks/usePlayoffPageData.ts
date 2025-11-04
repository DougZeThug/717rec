
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
  ready: boolean;
  
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
  
  // Simplified bracket data
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
  
  const { profile, user } = useAuth();
  const isAdmin = profile?.is_admin || false;
  
  // DEBUG: Authentication state
  useEffect(() => {
    console.log('👤 Authentication state:', {
      user: user ? { id: user.id, email: user.email } : null,
      profile: profile ? { id: profile.id, is_admin: profile.is_admin, username: profile.username } : null,
      isAdmin,
      timestamp: new Date().toISOString()
    });
  }, [user, profile, isAdmin]);

  // DEBUG: Enhanced URL parameter debugging
  useEffect(() => {
    const bracketParam = searchParams.get('bracket');
    const currentUrl = window.location.href;
    const currentSearch = window.location.search;
    
    console.log('🔍 DEBUG: URL Parameter Analysis:', {
      currentUrl,
      currentSearch,
      searchParamsObject: Object.fromEntries(searchParams.entries()),
      bracketParam,
      bracketParamType: typeof bracketParam,
      bracketParamLength: bracketParam?.length,
      allParams: Array.from(searchParams.entries()),
      selectedBracketId,
      timestamp: new Date().toISOString()
    });
    
    if (bracketParam && bracketParam !== selectedBracketId) {
      console.log('🔄 DEBUG: Setting bracket ID from URL:', {
        from: selectedBracketId,
        to: bracketParam,
        reason: 'URL parameter change'
      });
      setSelectedBracketIdState(bracketParam);
    } else if (!bracketParam && selectedBracketId) {
      console.log('🔄 DEBUG: Clearing bracket ID:', {
        from: selectedBracketId,
        to: null,
        reason: 'URL parameter removed'
      });
      setSelectedBracketIdState(null);
    }
  }, [searchParams, selectedBracketId]);

  // Enhanced bracket ID management with cache invalidation
  const setSelectedBracketId = useCallback((id: string | null) => {
    console.log('🎯 DEBUG: setSelectedBracketId called:', {
      newId: id,
      currentId: selectedBracketId,
      caller: new Error().stack?.split('\n')[2]?.trim()
    });
    
    setSelectedBracketIdState(id);
    
    if (id) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('bracket', id);
      setSearchParams(newSearchParams);
      
      // Preload bracket data for better UX
      queryClient.prefetchQuery({
        queryKey: ['bracket-data', id],
        staleTime: 1000 * 60 * 2 // 2 minutes
      });
      
      console.log('🎯 DEBUG: Updated URL and preloaded data for bracket:', id);
    } else {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('bracket');
      setSearchParams(newSearchParams);
      
      console.log('🎯 DEBUG: Removed bracket from URL');
    }
  }, [searchParams, setSearchParams, queryClient, selectedBracketId]);

  // Enhanced bracket data with optimistic updates and error recovery
  const { 
    data: selectedBracket, 
    isLoading: selectedBracketLoading, 
    error: selectedBracketError,
    refetch: refetchSelectedBracket
  } = useBracketData(selectedBracketId);
  
  // DEBUG: Enhanced bracket data logging
  useEffect(() => {
    console.log('🎯 DEBUG: useBracketData hook state:', {
      selectedBracketId,
      selectedBracketIdType: typeof selectedBracketId,
      selectedBracketIdValid: !!selectedBracketId,
      selectedBracket: selectedBracket ? {
        id: selectedBracket.id,
        name: selectedBracket.name,
        matchesCount: selectedBracket.matches?.length,
        teamsCount: selectedBracket.teams?.length,
        state: selectedBracket.state,
        format: selectedBracket.format
      } : null,
      selectedBracketLoading,
      selectedBracketError: selectedBracketError?.message,
      timestamp: new Date().toISOString()
    });
  }, [selectedBracketId, selectedBracket, selectedBracketLoading, selectedBracketError]);
  
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
  } = usePlayoffData(isAdmin);
  
  // DEBUG: Enhanced brackets overview logging
  useEffect(() => {
    console.log('🏆 DEBUG: Brackets overview data:', {
      allBrackets: allBrackets ? {
        count: allBrackets.length,
        ids: allBrackets.map(b => b.id),
        names: allBrackets.map(b => b.name)
      } : null,
      bracketsLoading,
      teamsByDivision: teamsByDivision ? Object.keys(teamsByDivision) : null,
      bracketsByDivision: bracketsByDivision ? 
        Object.entries(bracketsByDivision).map(([div, brackets]) => ({
          division: div,
          count: Array.isArray(brackets) ? brackets.length : 0
        })) : null,
      bracketsDataError: bracketsDataError?.message,
      timestamp: new Date().toISOString()
    });
  }, [allBrackets, bracketsLoading, teamsByDivision, bracketsByDivision, bracketsDataError]);
  
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
      // Get unique display divisions, excluding Hidden
      const uniqueDisplayDivisions = new Set<string>();
      divisions.forEach(div => {
        if (div.display_division && div.display_division !== 'Hidden') {
          uniqueDisplayDivisions.add(div.display_division);
        }
      });
      return Array.from(uniqueDisplayDivisions);
    } catch (err) {
      const errorMessage = getUIErrorMessage(err, "Failed to process divisions data");
      logError(err, "availableDivisions processing");
      setError(errorMessage);
      return [];
    }
  })();

  const deleteBracket = useCallback(async (bracketId: string, bracketName: string) => {
    console.log('🗑️ DEBUG: Deleting bracket:', { bracketId, bracketName });
    
    try {
      const { error } = await supabase
        .from('brackets')
        .delete()
        .eq('id', bracketId);
      
      if (error) {
        throw error;
      }
      
      // Comprehensive cache invalidation
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
      
      console.log('🗑️ DEBUG: Successfully deleted bracket and cleared cache');
    } catch (error) {
      console.error('🗑️ DEBUG: Error deleting bracket:', error);
      const errorMessage = getUIErrorMessage(error, "Failed to delete bracket");
      logError(error, "deleteBracket");
      throw new Error(errorMessage);
    }
  }, [queryClient, selectedBracketId, setSelectedBracketId]);
  
  // Enhanced bracket creation handler with comprehensive cache management
  const handleBracketCreated = useCallback(async () => {
    console.log('➕ DEBUG: Handling bracket creation');
    
    try {
      await originalHandleBracketCreated();
      
      // Comprehensive cache invalidation and refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['brackets'] }),
        queryClient.invalidateQueries({ queryKey: ['playoff-data'] }),
        queryClient.invalidateQueries({ queryKey: ['divisions'] }),
        originalRefetchBrackets()
      ]);
      
      console.log('➕ DEBUG: Successfully handled bracket creation and cache refresh');
    } catch (error) {
      console.error('➕ DEBUG: Error in handleBracketCreated:', error);
      const errorMessage = getUIErrorMessage(error, "Failed to create bracket");
      logError(error, "handleBracketCreated");
      setError(errorMessage);
    }
  }, [originalHandleBracketCreated, originalRefetchBrackets, queryClient]);

  // Enhanced refetch function with Promise type fix
  const refetchBrackets = useCallback(async () => {
    console.log('🔄 DEBUG: Refetching all brackets data');
    
    try {
      // Handle refetch promises separately to fix type mismatch
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
        console.log('🔄 DEBUG: Refetched brackets and selected bracket data');
      } else {
        await Promise.all(cacheInvalidationPromises);
        console.log('🔄 DEBUG: Refetched brackets data (no selected bracket)');
      }
      
      return true;
    } catch (error) {
      console.error('🔄 DEBUG: Error in refetchBrackets:', error);
      const errorMessage = getUIErrorMessage(error, "Failed to refresh data");
      logError(error, "refetchBrackets");
      setError(errorMessage);
      throw error;
    }
  }, [originalRefetchBrackets, queryClient, selectedBracketId, refetchSelectedBracket]);

  // Convert error types to strings
  const finalDivisionsError = convertErrorToString(divisionsError);
  const finalBracketsError = convertErrorToString(bracketsDataError);

  // DEBUG: Final state logging
  useEffect(() => {
    console.log('🏁 DEBUG: usePlayoffPageData final state:', {
      selectedBracketId,
      selectedBracketIdValid: !!selectedBracketId,
      bracket: selectedBracket ? {
        id: selectedBracket.id,
        hasMatches: !!selectedBracket.matches,
        matchesCount: selectedBracket.matches?.length,
        matchesIsArray: Array.isArray(selectedBracket.matches)
      } : null,
      isLoading,
      errors: {
        error,
        divisionsError: finalDivisionsError,
        bracketsError: finalBracketsError
      },
      timestamp: new Date().toISOString()
    });
  }, [selectedBracketId, selectedBracket, isLoading, error, finalDivisionsError, finalBracketsError]);

  return {
    // Auth & permissions
    profile,
    isAdmin,
    
    // Selected bracket state
    selectedBracketId,
    setSelectedBracketId,
    ready: !!selectedBracketId && !!selectedBracket && !selectedBracketLoading,
    
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
    
    // Direct bracket data with matches
    bracket: selectedBracket,
    teams: teamsData || [],
    teamsLoading,
    deleteBracket,
    
    // Simple loading state
    isLoading
  };
}
