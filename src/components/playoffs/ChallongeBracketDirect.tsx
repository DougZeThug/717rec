import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  SingleEliminationBracket, 
  DoubleEliminationBracket,
  Match,
  SVGViewer
} from "@g-loot/react-tournament-brackets";
import { supabase } from '@/integrations/supabase/client';
import { ChallongeTournamentComplete } from '@/services/challonge/types';
import { adaptChallongeToGloot, separateDoubleEliminationMatches } from '@/lib/challongeToGloot';
import { useWindowSize } from '@/hooks/useWindowSize';
import { useChallongeDualFlowEditMatch } from '@/hooks/playoffs/useChallongeDualFlowEditMatch';

interface ChallongeBracketDirectProps {
  tournamentId: number;
  onEditMatch?: (matchId: string) => void;
}

export const ChallongeBracketDirect: React.FC<ChallongeBracketDirectProps> = ({
  tournamentId,
  onEditMatch
}) => {
  const [windowWidth, windowHeight] = useWindowSize();
  const { handleEditMatch } = useChallongeDualFlowEditMatch();
  
  const { data: tournamentData, isLoading, error } = useQuery({
    queryKey: ['challonge-tournament', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('challonge', {
        body: {
          action: 'getTournamentComplete',
          args: { tournamentId }
        }
      });
      
      if (error) throw error;
      return data as ChallongeTournamentComplete;
    },
    enabled: !!tournamentId
  });

  const handleMatchClick = (match: any) => {
    // Use dual-flow editing for Challonge matches
    if (onEditMatch) {
      onEditMatch(match.id);
    } else {
      // Fallback to dual-flow handling
      handleEditMatch(match.id);
    }
  };

  if (isLoading) return <div className="p-4">Loading bracket...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading bracket</div>;
  if (!tournamentData?.tournament) return <div className="p-4">No tournament data</div>;

  const { tournament } = tournamentData;
  const matches = tournament.matches.map(m => m.match);
  const participants = tournament.participants.map(p => p.participant);
  
  const glootMatches = adaptChallongeToGloot(matches, participants);
  const isDoubleElimination = tournament.tournament_type === 'double elimination';
  
  // Calculate responsive dimensions for SVGViewer
  const finalWidth = Math.max(windowWidth - 50, 500);
  const finalHeight = Math.max(windowHeight - 100, 500);

  if (isDoubleElimination) {
    const { upper, lower } = separateDoubleEliminationMatches(glootMatches);
    
    return (
      <div className="w-full h-full">
        <DoubleEliminationBracket
          matches={{ upper, lower }}
          matchComponent={Match}
          onMatchClick={handleMatchClick}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer width={finalWidth} height={finalHeight} {...props}>
              {children}
            </SVGViewer>
          )}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <SingleEliminationBracket
        matches={glootMatches}
        matchComponent={Match}
        onMatchClick={handleMatchClick}
        svgWrapper={({ children, ...props }) => (
          <SVGViewer width={finalWidth} height={finalHeight} {...props}>
            {children}
          </SVGViewer>
        )}
      />
    </div>
  );
};