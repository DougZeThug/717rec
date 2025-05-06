import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Team } from "@/types";
import { toast } from "@/hooks/use-toast";

interface TeamMembershipData {
  id: string;
  user_id: string;
  team_id: string;
  joined_at: string;
  team?: Team;
}

export function useTeamMembership() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [membership, setMembership] = useState<TeamMembershipData | null>(null);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);

  // Fetch current team membership if user is logged in
  useEffect(() => {
    if (user) {
      fetchMembership();
      fetchTeams();
    }
  }, [user]);

  const fetchMembership = async () => {
    if (!user) return;
    
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from("team_memberships")
        .select(`
          id,
          user_id,
          team_id,
          joined_at,
          team:teams(id, name, logo_url, image_url, division_id, wins, losses, game_wins, game_losses)
        `)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      setMembership(data);
    } catch (error) {
      console.error("Error fetching team membership:", error);
    } finally {
      setIsFetching(false);
    }
  };
  
  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, logo_url, image_url, division_id, wins, losses")
        .order("name");
      
      if (error) throw error;
      setAvailableTeams(data || []);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const joinTeam = async (teamId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to join a team",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // If already in a team, update the membership
      if (membership) {
        const { error } = await supabase
          .from("team_memberships")
          .update({ team_id: teamId })
          .eq("user_id", user.id);
        
        if (error) throw error;
        
        toast({
          title: "Team Updated",
          description: "You've successfully changed teams",
        });
      } else {
        // Otherwise create a new membership
        const { error } = await supabase
          .from("team_memberships")
          .insert({ user_id: user.id, team_id: teamId });
        
        if (error) throw error;
        
        toast({
          title: "Team Joined",
          description: "You've successfully joined the team",
        });
      }
      
      // Refresh membership data
      await fetchMembership();
    } catch (error: any) {
      console.error("Error joining team:", error);
      toast({
        title: "Failed to join team",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const leaveTeam = async () => {
    if (!user || !membership) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("team_memberships")
        .delete()
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      setMembership(null);
      toast({
        title: "Team Left",
        description: "You've successfully left the team",
      });
    } catch (error: any) {
      console.error("Error leaving team:", error);
      toast({
        title: "Failed to leave team",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    membership,
    availableTeams,
    isLoading,
    isFetching,
    joinTeam,
    leaveTeam,
    refreshMembership: fetchMembership
  };
}
