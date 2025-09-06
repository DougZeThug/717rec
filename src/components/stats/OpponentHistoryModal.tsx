import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useOpponentHistory } from "@/hooks/useHeadToHead";
import { format } from "date-fns";
import { MapPin, Calendar } from "lucide-react";

interface OpponentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  opponentId: string;
  opponentName: string;
}

export const OpponentHistoryModal: React.FC<OpponentHistoryModalProps> = ({
  isOpen,
  onClose,
  teamId,
  opponentId,
  opponentName
}) => {
  const { data: history, isLoading } = useOpponentHistory(teamId, opponentId);

  if (!history?.summary) return null;

  const { summary, matches } = history;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Head-to-Head vs {opponentName}
          </DialogTitle>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{summary.matches_played}</div>
              <div className="text-sm text-muted-foreground">Matches</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{summary.wins}</div>
              <div className="text-sm text-muted-foreground">Wins</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-rose-600">{summary.losses}</div>
              <div className="text-sm text-muted-foreground">Losses</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
               <div className="text-2xl font-bold text-primary">
                 {Number(summary.win_pct).toFixed(1)}%
               </div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-emerald-600">
                {summary.game_wins} - {summary.game_losses}
              </div>
              <div className="text-sm text-muted-foreground">Game Record</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-primary">
                {summary.game_wins + summary.game_losses > 0 
                  ? ((summary.game_wins / (summary.game_wins + summary.game_losses)) * 100).toFixed(1)
                  : '0.0'
                }%
              </div>
              <div className="text-sm text-muted-foreground">Game Win Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Matches */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Recent Matches</h3>
          {isLoading ? (
            <div className="text-center py-4">Loading matches...</div>
          ) : matches.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No matches found</div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => {
                const isWin = match.winner_name === (teamId === match.team1_name ? match.team1_name : match.team2_name);
                return (
                  <Card key={match.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Badge variant={isWin ? "default" : "secondary"}>
                            {isWin ? "W" : "L"}
                          </Badge>
                          <div>
                            <div className="font-medium">
                              {match.team1_name} vs {match.team2_name}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center space-x-2">
                              <Calendar className="w-3 h-3" />
                              <span>{format(new Date(match.date), "MMM d, yyyy")}</span>
                              {match.location && (
                                <>
                                  <MapPin className="w-3 h-3" />
                                  <span>{match.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {match.team1_score} - {match.team2_score}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Games: {match.team1_game_wins} - {match.team2_game_wins}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};