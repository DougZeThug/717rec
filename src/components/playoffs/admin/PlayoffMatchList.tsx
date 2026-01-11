import { Edit, RefreshCcw } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PlayoffMatch, Team } from '@/types';

interface PlayoffMatchListProps {
  matches: PlayoffMatch[];
  teams: Team[];
  onEditMatch: (matchId: string, quickEdit: boolean) => void;
  title?: string;
  roundFilter?: number;
  matchTypeFilter?: string;
}

const PlayoffMatchList: React.FC<PlayoffMatchListProps> = ({
  matches,
  teams,
  onEditMatch,
  title = 'Playoff Matches',
  roundFilter,
  matchTypeFilter,
}) => {
  const [selectedRound, setSelectedRound] = useState<string>(
    roundFilter ? roundFilter.toString() : 'all'
  );
  const [selectedType, setSelectedType] = useState<string>(matchTypeFilter || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Get available rounds and match types
  const rounds = Array.from(new Set(matches.map((match) => match.round))).sort((a, b) => a - b);
  const matchTypes = Array.from(new Set(matches.map((match) => match.matchType)));

  // Filter matches based on selections
  const filteredMatches = matches.filter((match) => {
    const roundMatch = selectedRound === 'all' || match.round === parseInt(selectedRound);
    const typeMatch = selectedType === 'all' || match.matchType === selectedType;

    let statusMatch = true;
    if (selectedStatus === 'pending') {
      statusMatch = !match.team1Id || !match.team2Id || (!match.winnerId && !match.loserId);
    } else if (selectedStatus === 'complete') {
      statusMatch = !!match.winnerId;
    } else if (selectedStatus === 'in_progress') {
      statusMatch = !!(match.team1Id && match.team2Id) && !match.winnerId;
    }

    return roundMatch && typeMatch && statusMatch;
  });

  // Group matches by round for display
  const matchesByRound = filteredMatches.reduce(
    (acc, match) => {
      const round = match.round;
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    },
    {} as Record<number, PlayoffMatch[]>
  );

  // Sort matches within each round by position
  Object.keys(matchesByRound).forEach((round) => {
    matchesByRound[parseInt(round)].sort((a, b) => a.position - b.position);
  });

  // Get team name by ID
  const getTeamNameById = (teamId?: string) => {
    if (!teamId) return 'TBD';
    if (teamId.startsWith('play-in-')) return `Winner of Play-in ${teamId.split('-')[2]}`;
    const team = teams.find((t) => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  // Format match status
  const getStatusBadge = (match: PlayoffMatch) => {
    if (!match.team1Id || !match.team2Id) {
      return <Badge variant="outline">Pending Teams</Badge>;
    } else if (match.winnerId) {
      return <Badge variant="recreational">Complete</Badge>;
    } else {
      return <Badge variant="secondary">Ready</Badge>;
    }
  };

  // Get match type display name
  const getMatchTypeDisplay = (type: string) => {
    switch (type) {
      case 'winners':
        return 'Winners Bracket';
      case 'losers':
        return 'Losers Bracket';
      case 'finals':
        return 'Finals';
      case 'play-in':
        return 'Play-in';
      default:
        return type;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          <div className="flex items-center space-x-2">
            <Select value={selectedRound} onValueChange={setSelectedRound}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Round" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rounds</SelectItem>
                {rounds.map((round) => (
                  <SelectItem key={round} value={round.toString()}>
                    Round {round}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Match Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {matchTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getMatchTypeDisplay(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">Ready</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(matchesByRound).length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No matches match the current filters
          </div>
        ) : (
          Object.keys(matchesByRound)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((roundKey) => {
              const roundNumber = parseInt(roundKey);
              const roundMatches = matchesByRound[roundNumber];

              return (
                <div key={roundKey} className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Round {roundNumber}
                    {roundMatches[0] && (
                      <span className="text-muted-foreground text-sm ml-2">
                        ({getMatchTypeDisplay(roundMatches[0].matchType)})
                      </span>
                    )}
                  </h3>

                  <div className="space-y-2">
                    {roundMatches.map((match) => (
                      <div
                        key={match.id}
                        className={cn(
                          'p-3 rounded-lg border flex items-center justify-between',
                          match.winnerId
                            ? 'bg-gray-50 dark:bg-gray-800/50'
                            : 'bg-white dark:bg-gray-900'
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-muted-foreground">
                              Match #{match.position}
                            </span>
                            {getStatusBadge(match)}
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                            <div className="text-left">
                              {match.team1Id ? (
                                <span className="font-medium">
                                  {getTeamNameById(match.team1Id)}
                                </span>
                              ) : (
                                <span className="italic text-muted-foreground">TBD</span>
                              )}
                            </div>

                            <div className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-center min-w-[60px]">
                              {match.team1GameWins !== undefined &&
                              match.team2GameWins !== undefined ? (
                                <span className="font-mono">
                                  {match.team1GameWins}-{match.team2GameWins}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">vs</span>
                              )}
                            </div>

                            <div className="text-right">
                              {match.team2Id ? (
                                <span className="font-medium">
                                  {getTeamNameById(match.team2Id)}
                                </span>
                              ) : (
                                <span className="italic text-muted-foreground">TBD</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="ml-4 flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditMatch(match.id, false)}
                            disabled={!match.team1Id || !match.team2Id}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditMatch(match.id, true)}
                            disabled={!match.team1Id || !match.team2Id}
                          >
                            <RefreshCcw className="h-4 w-4 mr-1" />
                            Quick
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </CardContent>
    </Card>
  );
};

export default PlayoffMatchList;
