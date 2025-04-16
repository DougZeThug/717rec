
import React from 'react';
import { Match, Team } from '@/types';
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';

interface MatchApprovalItemProps {
  match: Match;
  teams: Record<string, Team>;
  isOpen: boolean;
  onToggle: () => void;
  onApproveResult: (match: Match, winnerTeamIndex: 1 | 2) => void;
  onMarkAsTie: (matchId: string) => void;
}

const MatchApprovalItem = ({ 
  match, 
  teams, 
  isOpen, 
  onToggle, 
  onApproveResult, 
  onMarkAsTie 
}: MatchApprovalItemProps) => {
  return (
    <Collapsible
      key={match.id}
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
          {new Date(match.date).toLocaleDateString()}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 border-t bg-slate-50">
          <div className="flex justify-between items-center mb-4">
            <div className="text-center">
              <p className="font-medium">{teams[match.team1Id]?.name || 'Team 1'}</p>
              <p className="text-2xl font-bold">{match.team1Score}</p>
            </div>
            
            <div className="text-center">
              <p className="text-lg">vs</p>
            </div>
            
            <div className="text-center">
              <p className="font-medium">{teams[match.team2Id]?.name || 'Team 2'}</p>
              <p className="text-2xl font-bold">{match.team2Score}</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button 
                onClick={() => onApproveResult(match, 1)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {teams[match.team1Id]?.name || 'Team 1'} Wins
              </Button>
              
              <Button 
                onClick={() => onApproveResult(match, 2)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {teams[match.team2Id]?.name || 'Team 2'} Wins
              </Button>
            </div>
            
            <Button 
              onClick={() => onMarkAsTie(match.id)}
              variant="secondary"
            >
              Mark as Tie
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default MatchApprovalItem;
