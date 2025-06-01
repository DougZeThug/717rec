
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { usePlayoffViewModel } from "@/hooks/playoffs/usePlayoffViewModel";
import { usePlayoffData } from "@/hooks/usePlayoffViewModel.compat";
import { useChallongePublicBracket } from "@/hooks/useChallongePublicBracket";
import { useDivisions } from "@/hooks/useDivisions";
import { PlayoffBracket, BracketFormat, BracketState } from "@/utils/playoffs/playoffTypes";
import { BRACKET_FORMATS, BRACKET_STATES } from "@/constants/brackets";
import { getUIErrorMessage, logError, convertErrorToString } from "@/utils/errors";

export interface PlayoffPageData {
  // Auth & permissions
  profile: any;
  isAdmin: boolean;
  
  // Selected bracket state
  selectedBracketId: string | null;
  setSelectedBracketId: (id: string | null) => void;
  
  // Current bracket data
  bracket: any;
  isLoading: boolean;
  teams: any[];
  teamsLoading: boolean;
  bracketMatchesByType: any;
  deleteBracket: (bracketId: string, bracketName: string) => Promise<void>;
  
  // Enhanced error states - all strings for consistency
  error: string | null;
  divisionsError: string | null;
  teamsError: string | null;
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
  
  // Challonge data
  challongeBracket: {
    matches: any;
    participants: any;
    isLoading: boolean;
  };
}

export function usePlayoffPageData(): PlayoffPageData {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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

  // Enhanced data fetching with error handling
  const {
    bracket,
    isLoading: bracketLoading,
    teams,
    teamsLoading,
    bracketMatchesByType,
    deleteBracket,
    error: bracketError
  } = usePlayoffViewModel(selectedBracketId);
  
  // Add debugging for the bracket data flow
  console.log('🎯 usePlayoffPageData - Selected bracket ID:', selectedBracketId);
  console.log('🎯 usePlayoffPageData - Bracket from usePlayoffViewModel:', bracket);
  console.log('🎯 usePlayoffPageData - Bracket matches:', bracket?.matches);
  console.log('🎯 usePlayoffPageData - Bracket matches length:', bracket?.matches?.length);
  console.log('🎯 usePlayoffPageData - Teams from usePlayoffViewModel:', teams);
  console.log('🎯 usePlayoffPageData - bracketMatchesByType:', bracketMatchesByType);
  
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
  
  // Enhanced bracket creation handler with navigation
  const handleBracketCreated = async () => {
    console.log('🎯 usePlayoffPageData: handleBracketCreated called');
    
    try {
      // Get current bracket count before creation
      const currentBracketCount = allBrackets ? allBrackets.length : 0;
      console.log('🎯 usePlayoffPageData: Current bracket count before creation:', currentBracketCount);
      
      // Call the original handler
      await originalHandleBracketCreated();
      console.log('🎯 usePlayoffPageData: Original bracket creation handler completed');
      
      // Force additional refresh to ensure data is up to date
      console.log('🎯 usePlayoffPageData: Triggering additional bracket refetch');
      await refetchBrackets();
      console.log('🎯 usePlayoffPageData: Additional bracket refetch completed');
      
      // After successful creation and refresh, check if we have new brackets
      // and automatically navigate to the most recently created one
      console.log('🎯 usePlayoffPageData: Looking for newly created bracket to navigate to');
      
    } catch (error) {
      console.error('🎯 usePlayoffPageData: Error in handleBracketCreated:', error);
      const errorMessage = getUIErrorMessage(error, "Failed to refresh bracket data after creation");
      logError(error, "handleBracketCreated");
      setError(errorMessage);
    }
  };

  // Handle Challonge bracket display
  const challongeBracket = useChallongePublicBracket(
    bracket?.challonge_tournament_id ? String(bracket.challonge_tournament_id) : "0"
  );

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

  // Enhanced loading and error states
  const isLoading = bracketsLoading || divisionsLoading || teamsLoading || bracketLoading;
  
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
  const teamsError = convertErrorToString(bracketError);
  const finalDivisionsError = convertErrorToString(divisionsError);
  const finalBracketsError = convertErrorToString(bracketsDataError);

  return {
    // Auth & permissions
    profile,
    isAdmin,
    
    // Selected bracket state
    selectedBracketId,
    setSelectedBracketId,
    
    // Current bracket data
    bracket,
    isLoading: bracketLoading,
    teams: Array.isArray(teams) ? teams : [],
    teamsLoading,
    bracketMatchesByType,
    deleteBracket,
    
    // Enhanced error states - all properly converted to strings
    error,
    divisionsError: finalDivisionsError,
    teamsError,
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
    
    // Challonge data
    challongeBracket
  };
}
