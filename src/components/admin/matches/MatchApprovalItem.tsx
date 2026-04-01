import { CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { FALLBACK_TEAM_IMAGE } from '@/constants/images';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Match, Team } from '@/types';

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
  onMarkAsTie,
}: MatchApprovalItemProps) => {
  const team1 = teams[match.team1Id];
  const team2 = teams[match.team2Id];
  const team1Image = team1?.imageUrl || team1?.logoUrl;
  const team2Image = team2?.imageUrl || team2?.logoUrl;

  return (
    <Collapsible
      key={match.id}
      open={isOpen}
      onOpenChange={onToggle}
      className="border rounded-md overflow-hidden"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-secondary">
        <div className="flex items-center">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 mr-2" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-2" />
          )}
          <div className="flex items-center">
            <div className="w-6 h-6 overflow-hidden bg-muted mr-2">
              {team1Image && (
                <img
                  src={team1Image}
                  alt=""
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_TEAM_IMAGE;
                  }}
                />
              )}
            </div>
            <span>{team1?.name || 'Team 1'} vs</span>
            <div className="w-6 h-6 overflow-hidden bg-muted mx-2">
              {team2Image && (
                <img
                  src={team2Image}
                  alt=""
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=300&fit=crop';
                  }}
                />
              )}
            </div>
            <span>{team2?.name || 'Team 2'}</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date(match.date).toLocaleDateString()}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 border-t bg-secondary">
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

            <Button onClick={() => onMarkAsTie(match.id)} variant="secondary">
              Mark as Tie
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default MatchApprovalItem;
