import { useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { usePlayoffViewModel } from "@/hooks/playoffs/usePlayoffViewModel";
import { usePlayoffData } from "@/hooks/usePlayoffViewModel.compat";
import { useChallongePublicBracket } from "@/hooks/useChallongePublicBracket";
import { useDivisions } from "@/hooks/useDivisions";
import { PlayoffBracket, BracketFormat, BracketState } from "@/utils/playoffs/playoffTypes";
import { BRACKET_FORMATS, BRACKET_STATES } from "@/constants/brackets";

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
  
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin || false;

  // Use our unified view model hook for the selected bracket
  const {
    bracket,
    isLoading: bracketLoading,
    teams,
    teamsLoading,
    bracketMatchesByType,
    deleteBracket
  } = usePlayoffViewModel(selectedBracketId);
  
  // Fetch divisions directly to ensure we have proper data
  const { divisions, isLoading: divisionsLoading } = useDivisions();
  
  // Setup for divisions and brackets lists (separate from single bracket view)
  const {
    brackets: allBrackets,
    bracketsLoading,
    teamsByDivision,
    bracketsByDivision,
    handleBracketCreated,
    handleTeamDivisionChange,
    refetchBrackets
  } = usePlayoffData(); // Using the compatibility layer
  
  // Handle Challonge bracket display if the current bracket has a challonge_tournament_id
  const challongeBracket = useChallongePublicBracket(
    bracket?.challonge_tournament_id ? String(bracket.challonge_tournament_id) : "0"
  );

  // Create typesafe version of bracketsByDivision
  const typesafeBracketsByDivision: Record<string, PlayoffBracket[]> = {};
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

  const isLoading = bracketsLoading || divisionsLoading || teamsLoading || bracketLoading;
  const allBracketsData = allBrackets?.map(b => ({
    ...b,
    matches: b.matches || [],
    id: b.id || crypto.randomUUID(),
    state: (b.state || BRACKET_STATES.PENDING) as BracketState,
    format: (b.format || BRACKET_FORMATS.DOUBLE) as BracketFormat
  })) || [];
  const availableDivisions = divisions?.map(div => div.name) || [];

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
