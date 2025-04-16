
import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Trash2 } from "lucide-react";
import { Match, Team } from "@/types";
import { Link } from "react-router-dom";

interface MatchCardProps {
  match: Match;
  teams: Team[];
  onEdit: (match: Match) => void;
  onDelete: (matchId: string) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, teams, onEdit, onDelete }) => {
  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  
  if (!team1 || !team2) return null;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 text-center">
            <Link to={`/teams/${team1.id}`} className="block">
              <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-gray-200 mb-2 hover:opacity-80 transition-opacity">
                {team1.imageUrl ? (
                  <img 
                    src={team1.imageUrl} 
                    alt={team1.name} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-xs">No Logo</div>
                )}
              </div>
              <h3 className="font-medium truncate hover:underline">{team1.name}</h3>
            </Link>
            {match.iscompleted && (
              <p className={`text-2xl font-bold ${match.winnerId === team1.id ? 'text-green-600' : 'text-gray-500'}`}>
                {match.team1Score}
              </p>
            )}
          </div>
          
          <div className="mx-4">
            <div className="text-lg font-bold">VS</div>
            {match.iscompleted && <div className="mt-2 text-xs text-gray-500">Final</div>}
          </div>
          
          <div className="flex-1 text-center">
            <Link to={`/teams/${team2.id}`} className="block">
              <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-gray-200 mb-2 hover:opacity-80 transition-opacity">
                {team2.imageUrl ? (
                  <img 
                    src={team2.imageUrl} 
                    alt={team2.name} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-xs">No Logo</div>
                )}
              </div>
              <h3 className="font-medium truncate hover:underline">{team2.name}</h3>
            </Link>
            {match.iscompleted && (
              <p className={`text-2xl font-bold ${match.winnerId === team2.id ? 'text-green-600' : 'text-gray-500'}`}>
                {match.team2Score}
              </p>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formatDate(match.date)} at {formatTime(match.date)}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2 pb-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-cornhole-navy border-cornhole-navy hover:bg-cornhole-navy hover:text-white"
          onClick={() => onEdit(match)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="text-destructive border-destructive hover:bg-destructive hover:text-white"
          onClick={() => onDelete(match.id)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MatchCard;
