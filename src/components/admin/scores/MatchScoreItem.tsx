
import React from 'react';
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
  onSubmitScore: () => void;
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
              <p className="text-sm font-medium mb-1">{teams[match.team1Id]?.name || 'Team 1'} Score</p>
              <Input
                type="number"
                min="0"
                value={team1Score}
                onChange={(e) => onScoreChange('team1Score', e.target.value)}
                placeholder="Enter score"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">{teams[match.team2Id]?.name || 'Team 2'} Score</p>
              <Input
                type="number"
                min="0"
                value={team2Score}
                onChange={(e) => onScoreChange('team2Score', e.target.value)}
                placeholder="Enter score"
              />
            </div>
          </div>
          
          {match.best_of && match.best_of > 1 && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Game Wins (Best of {match.best_of})</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{teams[match.team1Id]?.name || 'Team 1'} Game Wins</p>
                  <Input
                    type="number"
                    min="0"
                    max={Math.ceil(match.best_of / 2)}
                    defaultValue={match.team1_game_wins?.toString() || "0"}
                    onChange={(e) => {
                      if (match.team1_game_wins !== undefined) {
                        match.team1_game_wins = parseInt(e.target.value) || 0;
                      }
                    }}
                    placeholder="Game wins"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{teams[match.team2Id]?.name || 'Team 2'} Game Wins</p>
                  <Input
                    type="number"
                    min="0"
                    max={Math.ceil(match.best_of / 2)}
                    defaultValue={match.team2_game_wins?.toString() || "0"}
                    onChange={(e) => {
                      if (match.team2_game_wins !== undefined) {
                        match.team2_game_wins = parseInt(e.target.value) || 0;
                      }
                    }}
                    placeholder="Game wins"
                  />
                </div>
              </div>
            </div>
          )}
          
          <Button onClick={onSubmitScore}>Submit Result</Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default MatchScoreItem;
