import React from 'react';

import TeamForm from '@/components/teams/TeamForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTeams } from '@/hooks/useTeams';
import { Team } from '@/types';
import { errorLog } from '@/utils/logger';

const TeamsTab = () => {
  const { toast } = useToast();
  const { createTeam } = useTeams();

  const handleTeamSubmit = async (teamData: Omit<Team, 'id' | 'created_at'>) => {
    try {
      const newTeam = await createTeam(teamData);
      toast({
        title: 'Team Created',
        description: `${newTeam.name} has been successfully created.`,
      });
    } catch (error) {
      errorLog('Error creating team:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Team</CardTitle>
      </CardHeader>
      <CardContent>
        <TeamForm onSubmit={handleTeamSubmit} onCancel={() => {}} />
      </CardContent>
    </Card>
  );
};

export default TeamsTab;
