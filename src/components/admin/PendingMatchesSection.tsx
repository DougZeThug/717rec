
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Match, Team } from '@/types';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

const PendingMatchesSection = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingMatches();
    fetchTeams();
  }, []);

  const fetchPendingMatches = async () => {
    try {
      // Get matches that are completed but have a tie (winnerId is null)
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('isCompleted', true)
        .is('winner_id', null)
        .order('date');

      if (error) throw error;

      // Transform database fields to match our frontend types
      const transformedMatches: Match[] = (data || []).map(match => ({
        id: match.id,
        team1Id: match.team1_id || '',
        team2Id: match.team2_id || '',
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        date: match.date || match.created_at || new Date().toISOString(),
        location: match.location || '',
        isCompleted: match.isCompleted || false,
        winnerId: match.winner_id,
        loserId: match.loser_id
      }));
      
      setMatches(transformedMatches);
    } catch (error) {
      console.error('Error fetching pending matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending matches. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*');

      if (error) throw error;
      
      const teamsMap: Record<string, Team> = {};
      data?.forEach(team => {
        // Transform database team to match our Team interface
        teamsMap[team.id] = {
          id: team.id,
          name: team.name,
          logoUrl: team.logo_url,
          imageUrl: team.image_url,
          players: Array.isArray(team.players) 
            ? team.players.map((playerName: string) => ({ name: playerName })) 
            : [],
          wins: team.wins || 0,
          losses: team.losses || 0,
          created_at: team.created_at || '',
          division: team.division_id || null,
          divisionName: null
        };
      });
      
      setTeams(teamsMap);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleApproveResult = async (match: Match, winnerTeamIndex: 1 | 2) => {
    try {
      const winnerId = winnerTeamIndex === 1 ? match.team1Id : match.team2Id;
      const loserId = winnerTeamIndex === 1 ? match.team2Id : match.team1Id;

      const { error } = await supabase
        .from('matches')
        .update({
          winner_id: winnerId,
          loser_id: loserId
        })
        .eq('id', match.id);

      if (error) throw error;
      
      // Update team win/loss records
      await supabase
        .from('teams')
        .update({
          wins: teams[winnerId].wins + 1
        })
        .eq('id', winnerId);
        
      await supabase
        .from('teams')
        .update({
          losses: teams[loserId].losses + 1
        })
        .eq('id', loserId);

      toast({
        title: 'Result Approved',
        description: 'Match result has been successfully approved.',
      });
      
      // Refresh the matches list
      fetchPendingMatches();
    } catch (error) {
      console.error('Error approving result:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve result. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsTie = async (matchId: string) => {
    try {
      // For ties, we keep both winnerId and loserId as null
      const { error } = await supabase
        .from('matches')
        .update({
          winner_id: null,
          loser_id: null
        })
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: 'Match Marked as Tie',
        description: 'Match has been successfully marked as a tie.',
      });
      
      // Refresh the matches list - this match will still show in the list as it's a tie
      fetchPendingMatches();
    } catch (error) {
      console.error('Error marking as tie:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark match as tie. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (isLoading) {
    return <div>Loading pending matches...</div>;
  }

  if (matches.length === 0) {
    return <div className="p-4 bg-slate-50 rounded-md">No pending matches to approve.</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        Review and approve match results, or mark them as ties.
      </p>
      
      <div className="space-y-4">
        {matches.map(match => (
          <Collapsible
            key={match.id}
            open={!!openItems[match.id]}
            onOpenChange={() => toggleItem(match.id)}
            className="border rounded-md overflow-hidden"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-slate-50">
              <div className="flex items-center">
                {openItems[match.id] ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
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
                      onClick={() => handleApproveResult(match, 1)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {teams[match.team1Id]?.name || 'Team 1'} Wins
                    </Button>
                    
                    <Button 
                      onClick={() => handleApproveResult(match, 2)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {teams[match.team2Id]?.name || 'Team 2'} Wins
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={() => handleMarkAsTie(match.id)}
                    variant="secondary"
                  >
                    Mark as Tie
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};

export default PendingMatchesSection;
