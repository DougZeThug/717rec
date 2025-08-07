import { useState } from 'react';
import { hideTeam, unhideTeam, getHiddenTeams, HideTeamResult, UnhideTeamResult } from '@/services/teams/TeamHiddenService';
import { useToast } from '@/hooks/use-toast';

export function useHiddenTeams() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleHideTeam = async (teamId: string): Promise<HideTeamResult> => {
    setIsLoading(true);
    try {
      const result = await hideTeam(teamId);
      
      if (result.success) {
        toast({
          title: "Team Hidden",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error hiding team:', error);
      const errorResult: HideTeamResult = {
        success: false,
        message: 'An unexpected error occurred'
      };
      
      toast({
        title: "Error",
        description: errorResult.message,
        variant: "destructive"
      });
      
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnhideTeam = async (teamId: string, targetDivisionId: string): Promise<UnhideTeamResult> => {
    setIsLoading(true);
    try {
      const result = await unhideTeam(teamId, targetDivisionId);
      
      if (result.success) {
        toast({
          title: "Team Restored",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error unhiding team:', error);
      const errorResult: UnhideTeamResult = {
        success: false,
        message: 'An unexpected error occurred'
      };
      
      toast({
        title: "Error",
        description: errorResult.message,
        variant: "destructive"
      });
      
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHiddenTeams = async () => {
    setIsLoading(true);
    try {
      const result = await getHiddenTeams();
      return result;
    } catch (error) {
      console.error('Error fetching hidden teams:', error);
      return { data: [], error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    hideTeam: handleHideTeam,
    unhideTeam: handleUnhideTeam,
    getHiddenTeams: fetchHiddenTeams
  };
}