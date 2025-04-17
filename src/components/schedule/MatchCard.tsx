
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Trash2, Clock } from "lucide-react";
import { Match, Team, TeamTimeslot } from "@/types";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import TeamDayTimeslot from "../timeslots/TeamDayTimeslot";
import { getCardInteractionStyles } from "@/styles/interactionUtils";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  match: Match;
  teams: Team[];
  onEdit: (match: Match) => void;
  onDelete: (matchId: string) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, teams, onEdit, onDelete }) => {
  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoadingTimeslots, setIsLoadingTimeslots] = useState(true);
  
  useEffect(() => {
    // Only fetch timeslots if we have a match date
    if (match.date) {
      const fetchTimeslots = async () => {
        setIsLoadingTimeslots(true);
        
        try {
          const matchDate = new Date(match.date);
          const formattedDate = format(matchDate, 'yyyy-MM-dd');
          
          const { data, error } = await supabase
            .from('team_timeslots')
            .select('*')
            .eq('match_date', formattedDate)
            .in('team_id', [match.team1Id, match.team2Id]);
            
          if (error) {
            throw error;
          }
          
          setTimeslots(data || []);
        } catch (error) {
          console.error('Error fetching timeslots for match:', error);
        } finally {
          setIsLoadingTimeslots(false);
        }
      };
      
      fetchTimeslots();
    } else {
      setIsLoadingTimeslots(false);
    }
  }, [match]);
  
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

  const matchDate = match.date ? new Date(match.date) : null;

  return (
    <Card className={getCardInteractionStyles("overflow-hidden transition-all duration-300")}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 text-center">
            <Link to={`/teams/${team1.id}`} className="block transition-opacity hover:opacity-80">
              <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-gray-200 mb-2">
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
            {matchDate && (
              <div className="mt-1">
                <TeamDayTimeslot 
                  teamId={team1.id} 
                  date={matchDate} 
                  timeslots={timeslots}
                  isLoading={isLoadingTimeslots}
                />
              </div>
            )}
          </div>
          
          <div className="mx-4">
            <div className="text-lg font-bold">VS</div>
            {match.iscompleted && <div className="mt-2 text-xs text-gray-500">Final</div>}
          </div>
          
          <div className="flex-1 text-center">
            <Link to={`/teams/${team2.id}`} className="block transition-opacity hover:opacity-80">
              <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-gray-200 mb-2">
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
            {matchDate && (
              <div className="mt-1">
                <TeamDayTimeslot 
                  teamId={team2.id} 
                  date={matchDate} 
                  timeslots={timeslots}
                  isLoading={isLoadingTimeslots}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{match.date ? `${formatDate(match.date)} at ${formatTime(match.date)}` : 'Date TBD'}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2 pb-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-cornhole-navy border-cornhole-navy hover:bg-cornhole-navy hover:text-white active:scale-[0.98] transition-transform duration-150"
          onClick={() => onEdit(match)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="text-destructive border-destructive hover:bg-destructive hover:text-white active:scale-[0.98] transition-transform duration-150"
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
