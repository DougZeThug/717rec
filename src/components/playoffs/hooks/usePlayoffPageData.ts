
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  
  // Enhanced error states - all strings for consistency
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
  
  // NEW: Compatibility properties for current selected bracket
  bracket: any;
  teams: any[];
  teamsLoading: boolean;
  deleteBracket: (bracketId: string, bracketName: string) => Promise<void>;
  
  // Simplified loading state
  isLoading: boolean;
}

export function usePlayoffPageData(): PlayoffPageData {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBracketId, setSelectedBracketIdState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin || false;

  // Enhanced setSelectedBracketId that updates both state and URL
  const setSelectedBracketId = (id: string | null) => {
    console.log('🎯 setSelectedBracketId called with:', id);
    setSelectedBracketIdState(id);
    
    if (id) {
      // Update URL parameters to include the bracket ID
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('bracket', id);
      setSearchParams(newSearchParams);
      console.log('🎯 Updated URL with bracket parameter:', id);
    } else {
      // Remove bracket parameter from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('bracket');
      setSearchParams(newSearchParams);
      console.log('🎯 Removed bracket parameter from URL');
    }
  };

  // Handle URL parameters for bracket selection
  useEffect(() => {
    const bracketParam = searchParams.get('bracket');
    console.log('🎯 URL bracket parameter:', bracketParam);
    console.log('🎯 Current selectedBracketId:', selectedBracketId);
    
    if (bracketParam && bracketParam !== selectedBracketId) {
      console.log('🎯 Setting selected bracket from URL:', bracketParam);
      setSelectedBracketIdState(bracketParam);
    } else if (!bracketParam && selectedBracketId) {
      console.log('🎯 No URL bracket parameter, clearing selection');
      setSelectedBracketIdState(null);
    }
  }, [searchParams, selectedBracketId]);

  // NEW: Use simplified bracket data hook for selected bracket
  const { data: selectedBracket, isLoading: selectedBracketLoading, error: selectedBracketError } = useBracketData(selectedBracketId);
  
  // NEW: Use teams hook
  const { data: teamsData, isLoading: teamsLoading } = usePlayoffTeams();

  // Fetch divisions with enhanced error handling
  const { 
    divisions, 
    isLoading: divisionsLoading,
    error: divisionsError 
  } = useDivisions();
  
  // Setup for divisions and brackets lists with error handling
  const {
    brackets: allBrackets,
    bracketsLoading,
    teamsByDivision,
    bracketsByDivision,
    handleBracketCreated: originalHandleBracketCreated,
    handleTeamDivisionChange,
    refetchBrackets,
    error: bracketsDataError
  } = usePlayoffData();
  
  // NEW: Delete bracket function
  const deleteBracket = async (bracketId: string, bracketName: string) => {
    console.log('🎯 usePlayoffPageData: Deleting bracket:', bracketId, bracketName);
    
    try {
      const { error } = await supabase
        .from('brackets')
        .delete()
        .eq('id', bracketId);
      
      if (error) {
        throw error;
      }
      
      console.log('🎯 usePlayoffPageData: Bracket deleted successfully');
    } catch (error) {
      console.error('🎯 usePlayoffPageData: Error deleting bracket:', error);
      const errorMessage = getUIErrorMessage(error, "Failed to delete bracket");
      logError(error, "deleteBracket");
      throw new Error(errorMessage);
    }
  };
  
  // Simplified bracket creation handler
  const handleBracketCreated = async () => {
    console.log('🎯 usePlayoffPageData: handleBracketCreated called');
    
    try {
      // Call the original handler
      await originalHandleBracketCreated();
      console.log('🎯 usePlayoffPageData: Original bracket creation handler completed');
      
      // Single refetch
      console.log('🎯 usePlayoffPageData: Triggering single bracket refetch');
      await refetchBrackets();
      console.log('🎯 usePlayoffPageData: Bracket refetch completed');
      
    } catch (error) {
      console.error('🎯 usePlayoffPageData: Error in handleBracketCreated:', error);
      const errorMessage = getUIErrorMessage(error, "Failed to create bracket");
      logError(error, "handleBracketCreated");
      setError(errorMessage);
    }
  };

  // Create typesafe version of bracketsByDivision with error handling
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

  // Enhanced loading state
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

  // Safely convert error types to strings for UI display using new utility
  const finalDivisionsError = convertErrorToString(divisionsError);
  const finalBracketsError = convertErrorToString(bracketsDataError);

  return {
    // Auth & permissions
    profile,
    isAdmin,
    
    // Selected bracket state
    selectedBracketId,
    setSelectedBracketId,
    
    // Enhanced error states - all properly converted to strings
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
    
    // NEW: Compatibility properties
    bracket: selectedBracket,
    teams: teamsData || [],
    teamsLoading,
    deleteBracket,
    
    // Simplified loading state
    isLoading
  };
}
