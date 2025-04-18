import React, { useState } from 'react';
import { Match, Team } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from 'lucide-react';

interface MatchScoreItemProps {
  match: Match;
  teams: Record<string, Team>;
  isOpen: boolean;
  team1Score: string;
  team2Score: string;
  onToggle: () => void;
  onScoreChange: (team: 'team1Score' | 'team2Score', value: string) => void;
  onSubmitScore: (team1Score: string, team2Score: string, team1GameWins: number, team2GameWins: number) => Promise<boolean>;
}

const MatchScoreItem = ({ 
  match, 
  teams, 
  isOpen, 
  team1Score, 
  team2Score,
  onToggle, 
  onScoreChange, 
  onSubmitScore 
}: MatchScoreItemProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [team1GameWins, setTeam1GameWins] = React.useState(match.team1_game_wins?.toString() || "0");
  const [team2GameWins, setTeam2GameWins] = React.useState(match.team2_game_wins?.toString() || "0");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Parse game wins
      const team1Wins = parseInt(team1GameWins) || 0;
      const team2Wins = parseInt(team2GameWins) || 0;
      
      // Determine match winner based on game wins
      const matchScore1 = team1Wins > team2Wins ? "1" : "0";
      const matchScore2 = team2Wins > team1Wins ? "1" : "0";
      
      console.log(`Submitting match ${match.id}:`);
      console.log(`Team 1 (${teams[match.team1Id]?.name}):`);
      console.log(`- Match result: ${matchScore1} (win/loss)`);
      console.log(`- Game wins: ${team1Wins}`);
      console.log(`Team 2 (${teams[match.team2Id]?.name}):`);
      console.log(`- Match result: ${matchScore2} (win/loss)`);
      console.log(`- Game wins: ${team2Wins}`);
      
      await onSubmitScore(
        matchScore1, 
        matchScore2,
        team1Wins,
        team2Wins
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={onToggle}
      className="border rounded-md overflow-hidden"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-slate-50">
        <div className="flex items-center">
          {isOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
          <span>
            {teams[match.team1Id]?.name || 'Team 1'} vs {teams[match.team2Id]?.name || 'Team 2'}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {new Date(match.date || '').toLocaleDateString()}
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-4 border-t bg-slate-50">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm font-medium mb-1">
                {teams[match.team1Id]?.name || 'Team 1'} Game Wins
              </p>
              <Input
                type="number"
                min="0"
                value={team1GameWins}
                onChange={(e) => setTeam1GameWins(e.target.value)}
                placeholder="Enter game wins"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">
                {teams[match.team2Id]?.name || 'Team 2'} Game Wins
              </p>
              <Input
                type="number"
                min="0"
                value={team2GameWins}
                onChange={(e) => setTeam2GameWins(e.target.value)}
                placeholder="Enter game wins"
              />
            </div>
          </div>
          
          {match.best_of && match.best_of > 1 && (
            <div className="mb-4 text-sm text-gray-500">
              Best of {match.best_of} - First to {Math.ceil(match.best_of / 2)} wins
            </div>
          )}
          
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Result'}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default MatchScoreItem;
