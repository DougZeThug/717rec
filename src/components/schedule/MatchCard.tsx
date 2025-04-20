import React from "react";
import { Match, Team } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

interface MatchCardProps {
  match: Match;
  teams: Team[];
  isCompleted: boolean;
  onEdit?: (match: Match) => void;
  onDelete?: (matchId: string) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  teams, 
  isCompleted = false, 
  onEdit, 
  onDelete 
}) => {
  const team1 = teams.find(team => team.id === match.team1Id);
  const team2 = teams.find(team => team.id === match.team2Id);
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No date set";
    try {
      return format(parseISO(dateStr), "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      console.error("Date parsing error:", e);
      return "Invalid date";
    }
  };

  const getScoreText = () => {
    if (match.iscompleted) {
      return `${match.team1Score || 0} - ${match.team2Score || 0}`;
    }
    return "vs";
  };
  
  return (
    <Card className={`overflow-hidden ${match.iscompleted ? 'bg-gray-50 border-green-200' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{team1?.name || "Team 1"} vs {team2?.name || "Team 2"}</CardTitle>
          <div>
            {match.iscompleted && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" /> Completed
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-center items-center py-4">
            <div className="flex flex-col items-center w-1/3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                {team1?.logoUrl ? (
                  <img 
                    src={team1.logoUrl} 
                    alt={team1.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="text-2xl font-bold text-gray-400">{team1?.name?.charAt(0) || "T"}</div>
                )}
              </div>
              <div className="mt-2 text-center font-medium">{team1?.name || "Team 1"}</div>
            </div>
            
            <div className={`text-xl font-bold mx-4 ${match.iscompleted ? 'text-green-600' : ''}`}>
              {getScoreText()}
            </div>
            
            <div className="flex flex-col items-center w-1/3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                {team2?.logoUrl ? (
                  <img 
                    src={team2.logoUrl}
                    alt={team2.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="text-2xl font-bold text-gray-400">{team2?.name?.charAt(0) || "T"}</div>
                )}
              </div>
              <div className="mt-2 text-center font-medium">{team2?.name || "Team 2"}</div>
            </div>
          </div>
          
          {match.iscompleted && match.team1_game_wins !== undefined && match.team2_game_wins !== undefined && (
            <div className="bg-gray-100 p-2 rounded text-center text-sm">
              Game Wins: {team1?.name || "Team 1"} ({match.team1_game_wins}) - {team2?.name || "Team 2"} ({match.team2_game_wins})
            </div>
          )}
          
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(match.date)}
          </div>
          
          {match.location && (
            <div className="text-sm text-gray-500">
              Location: {match.location}
            </div>
          )}
        </div>
      </CardContent>
      {!isCompleted && (
        <CardFooter className="pt-2 border-t bg-gray-50 flex justify-end space-x-2">
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(match)}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onDelete(match.id)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default MatchCard;
