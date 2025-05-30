
import { useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { usePlayoffViewModel } from "@/hooks/playoffs/usePlayoffViewModel";
import { usePlayoffData } from "@/hooks/usePlayoffViewModel.compat";
import { useChallongePublicBracket } from "@/hooks/useChallongePublicBracket";
import { useDivisions } from "@/hooks/useDivisions";
import { PlayoffBracket, BracketFormat, BracketState } from "@/utils/playoffs/playoffTypes";
import { BRACKET_FORMATS, BRACKET_STATES } from "@/constants/brackets";
import { getUIErrorMessage, logError } from "@/utils/errors";

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
  
  // Enhanced error states
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
  const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin || false;

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
    handleBracketCreated,
    handleTeamDivisionChange,
    refetchBrackets,
    error: bracketsDataError
  } = usePlayoffData();
  
  // Handle Challonge bracket display
  const challongeBracket = useChallongePublicBracket(
    bracket?.challonge_tournament_id ? String(bracket.challonge_tournament_id) : "0"
  );

  // Create typesafe version of bracketsByDivision with error handling
  const typesafeBracketsByDivision: Record<string, PlayoffBracket[]> = {};
  try {
    if (bracketsByDivision) {
      Object.keys(bracketsByDivision).forEach(div => {
        typesafeBracketsByDivision[div] = (bracketsByDivision[div] || []).map(b => ({
          ...b,
          matches: b.matches || [],
          id: b.id || crypto.randomUUID(), 
          state: (b.state || BRACKET_STATES.PENDING) as BracketState, 
          format: (b.format || BRACKET_FORMATS.DOUBLE) as BracketFormat 
        }));
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
      return allBrackets?.map(b => ({
        ...b,
        matches: b.matches || [],
        id: b.id || crypto.randomUUID(),
        state: (b.state || BRACKET_STATES.PENDING) as BracketState,
        format: (b.format || BRACKET_FORMATS.DOUBLE) as BracketFormat
      })) || [];
    } catch (err) {
      const errorMessage = getUIErrorMessage(err, "Failed to process all brackets data");
      logError(err, "allBracketsData processing");
      setError(errorMessage);
      return [];
    }
  })();
  
  const availableDivisions = (() => {
    try {
      return divisions?.map(div => div.name) || [];
    } catch (err) {
      const errorMessage = getUIErrorMessage(err, "Failed to process divisions data");
      logError(err, "availableDivisions processing");
      setError(errorMessage);
      return [];
    }
  })();

  // Safely convert error types to strings for UI display
  const teamsError = bracketError ? getUIErrorMessage(bracketError, "Teams loading") : null;
  const finalDivisionsError = divisionsError || null;
  const finalBracketsError = bracketsDataError || null;

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
    teams: teams || [],
    teamsLoading,
    bracketMatchesByType,
    deleteBracket,
    
    // Enhanced error states
    error,
    divisionsError: finalDivisionsError,
    teamsError,
    bracketsError: finalBracketsError,
    
    // Divisions data
    divisions: divisions || [],
    divisionsLoading,
    availableDivisions,
    
    // All brackets data
    allBrackets: allBrackets || [],
    bracketsLoading,
    teamsByDivision,
    bracketsByDivision,
    typesafeBracketsByDivision,
    allBracketsData,
    handleBracketCreated,
    handleTeamDivisionChange,
    refetchBrackets,
    
    // Challonge data
    challongeBracket
  };
}
