
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Match, Team } from '@/types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const EditScoresSection = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, { team1Score: string, team2Score: string }>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchUncompletedMatches();
    fetchTeams();
  }, []);

  const fetchUncompletedMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('isCompleted', false)
        .order('date');

      if (error) throw error;
      
      // Transform database fields to match our frontend types
      const transformedMatches: Match[] = (data || []).map(match => ({
        id: match.id,
        team1Id: match.team1_id || '',
        team2Id: match.team2_id || '',
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        date: match.date || new Date().toISOString(),
        location: match.location || '',
        isCompleted: match.isCompleted || false,
        winnerId: match.winner_id,
        loserId: match.loser_id
      }));
      
      setMatches(transformedMatches);
      
      // Initialize scores state
      const initialScores: Record<string, { team1Score: string, team2Score: string }> = {};
      transformedMatches.forEach(match => {
        initialScores[match.id] = { 
          team1Score: match.team1Score?.toString() || '', 
          team2Score: match.team2Score?.toString() || '' 
        };
      });
      setScores(initialScores);
    } catch (error) {
      console.error('Error fetching uncompleted matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load matches. Please try again.',
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
            ? team.players.map(playerName => ({ name: playerName })) 
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

  const handleScoreChange = (matchId: string, team: 'team1Score' | 'team2Score', value: string) => {
    setScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: value
      }
    }));
  };

  const handleSubmitScore = async (matchId: string) => {
    try {
      const matchScore = scores[matchId];
      const team1Score = parseInt(matchScore.team1Score);
      const team2Score = parseInt(matchScore.team2Score);
      
      if (isNaN(team1Score) || isNaN(team2Score)) {
        toast({
          title: 'Invalid Scores',
          description: 'Please enter valid numbers for both scores.',
          variant: 'destructive',
        });
        return;
      }
      
      // Determine winner and loser
      let winnerId: string | null = null;
      let loserId: string | null = null;
      
      const match = matches.find(m => m.id === matchId);
      if (!match) return;
      
      if (team1Score > team2Score) {
        winnerId = match.team1Id;
        loserId = match.team2Id;
      } else if (team2Score > team1Score) {
        winnerId = match.team2Id;
        loserId = match.team1Id;
      }

      const { error } = await supabase
        .from('matches')
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          isCompleted: true,
          winner_id: winnerId,
          loser_id: loserId
        })
        .eq('id', matchId);

      if (error) throw error;
      
      // Update team win/loss records if there's a clear winner
      if (winnerId && loserId) {
        // Update winner record
        await supabase
          .from('teams')
          .update({
            wins: teams[winnerId].wins + 1
          })
          .eq('id', winnerId);
          
        // Update loser record
        await supabase
          .from('teams')
          .update({
            losses: teams[loserId].losses + 1
          })
          .eq('id', loserId);
      }

      toast({
        title: 'Scores Updated',
        description: 'Match scores have been successfully updated.',
      });
      
      // Refresh the matches list
      fetchUncompletedMatches();
    } catch (error) {
      console.error('Error updating scores:', error);
      toast({
        title: 'Error',
        description: 'Failed to update scores. Please try again.',
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
    return <div>Loading uncompleted matches...</div>;
  }

  if (matches.length === 0) {
    return <div className="p-4 bg-slate-50 rounded-md">All matches have scores submitted.</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        Submit scores for matches that have been completed. This will automatically update team records.
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
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium mb-1">{teams[match.team1Id]?.name || 'Team 1'} Score</p>
                    <Input
                      type="number"
                      min="0"
                      value={scores[match.id]?.team1Score || ''}
                      onChange={(e) => handleScoreChange(match.id, 'team1Score', e.target.value)}
                      placeholder="Enter score"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">{teams[match.team2Id]?.name || 'Team 2'} Score</p>
                    <Input
                      type="number"
                      min="0"
                      value={scores[match.id]?.team2Score || ''}
                      onChange={(e) => handleScoreChange(match.id, 'team2Score', e.target.value)}
                      placeholder="Enter score"
                    />
                  </div>
                </div>
                <Button onClick={() => handleSubmitScore(match.id)}>Submit Result</Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};

export default EditScoresSection;
