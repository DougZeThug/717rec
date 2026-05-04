import { Image, Plus, UserCheck } from 'lucide-react';
import React, { useState } from 'react';

import TeamForm from '@/components/teams/TeamForm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamsQuery } from '@/hooks/teams';
import { useDivisions } from '@/hooks/useDivisions';
import { usePendingMembershipCount } from '@/hooks/usePendingMembershipCount';
import { useTeams } from '@/hooks/useTeams';
import { useToast } from '@/hooks/useToast';
import { useUpdateTeam } from '@/hooks/useUpdateTeam';
import { Team } from '@/types';
import { errorLog } from '@/utils/logger';

import BulkLogoUpdateTab from './BulkLogoUpdateTab';
import EditTeamDialog from './EditTeamDialog';
import ManageTeamsPane from './ManageTeamsPane';
import TeamManagementStatsCards from './TeamManagementStatsCards';
import TeamMembershipApprovalTab from './TeamMembershipApprovalTab';

const noop = () => undefined;

type TabsProps = {
  pendingMembershipCount: number;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedDivision: string;
  setSelectedDivision: (value: string) => void;
  divisions: { id: string; name: string }[];
  filteredTeams: Team[];
  isUpdating: string | null;
  setEditingTeam: (team: Team) => void;
  handleDivisionChange: (teamId: string, divisionId: string | null) => Promise<void>;
  handleTeamSubmit: (teamData: Omit<Team, 'id' | 'created_at'>) => Promise<void>;
};


const TeamManagementTabList = ({ pendingMembershipCount }: { pendingMembershipCount: number }) => (
  <TabsList>
    <TabsTrigger value="manage">Manage Teams</TabsTrigger>
    <TabsTrigger value="create">Create Team</TabsTrigger>
    <TabsTrigger value="logos" className="gap-1.5"><Image className="h-3.5 w-3.5" />Update Logos</TabsTrigger>
    <TabsTrigger value="approvals" className="gap-1.5">
      <UserCheck className="h-3.5 w-3.5" />Member Approvals
      {pendingMembershipCount > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{pendingMembershipCount}</Badge>}
    </TabsTrigger>
  </TabsList>
);

const TeamManagementTabs = ({ pendingMembershipCount, searchTerm, setSearchTerm, selectedDivision, setSelectedDivision, divisions, filteredTeams, isUpdating, setEditingTeam, handleDivisionChange, handleTeamSubmit }: TabsProps) => (
  <Tabs defaultValue="manage" className="space-y-4">
    <TeamManagementTabList pendingMembershipCount={pendingMembershipCount} />
    <TabsContent value="manage" className="space-y-4">
      <ManageTeamsPane
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedDivision={selectedDivision}
        onSelectedDivisionChange={setSelectedDivision}
        divisions={divisions}
        filteredTeams={filteredTeams}
        actions={{
          onEdit: setEditingTeam,
          onDivisionChange: (teamId, value) => handleDivisionChange(teamId, value === 'unassigned' ? null : value),
          isUpdatingTeam: (teamId) => isUpdating === teamId,
        }}
      />
    </TabsContent>
    <TabsContent value="create">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Create New Team</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamForm onSubmit={handleTeamSubmit} onCancel={noop} />
        </CardContent>
      </Card>
    </TabsContent>
    <TabsContent value="logos"><BulkLogoUpdateTab /></TabsContent>
    <TabsContent value="approvals"><TeamMembershipApprovalTab /></TabsContent>
  </Tabs>
);

const TeamManagementTab = () => {
  const { toast } = useToast();
  const { createTeam } = useTeams();
  const { data: teams, isLoading: isLoadingTeams, refetch: refetchTeams } = useTeamsQuery({ includeHidden: true });
  const { divisions, isLoading: isLoadingDivisions } = useDivisions();
  const { data: pendingMembershipCount = 0 } = usePendingMembershipCount();
  const { updateTeam } = useUpdateTeam();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleTeamSubmit = async (teamData: Omit<Team, 'id' | 'created_at'>) => {
    try {
      const newTeam = await createTeam(teamData);
      toast({ title: 'Team Created', description: `${newTeam.name} has been successfully created.` });
      refetchTeams();
    } catch (error) {
      errorLog('Error creating team:', error);
    }
  };

  const handleEditTeam = async (teamData: Omit<Team, 'id' | 'created_at'>) => {
    if (!editingTeam) return;
    try {
      await updateTeam(editingTeam.id, teamData);
      toast({ title: 'Team Updated', description: `${teamData.name} has been successfully updated.` });
      setEditingTeam(null);
      refetchTeams();
    } catch (error) {
      errorLog('Error updating team:', error);
      toast({ title: 'Update Failed', description: 'Failed to update team. Please try again.', variant: 'destructive' });
    }
  };

  const handleDivisionChange = async (teamId: string, newDivisionId: string | null) => {
    setIsUpdating(teamId);
    try {
      const team = teams?.find((t) => t.id === teamId);
      if (!team) return;
      await updateTeam(teamId, { ...team, division_id: newDivisionId });
      toast({ title: 'Division Updated', description: 'Team division has been updated successfully.' });
      refetchTeams();
    } catch (error) {
      errorLog('Error updating team division:', error);
      toast({ title: 'Update Failed', description: 'Failed to update team division. Please try again.', variant: 'destructive' });
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredTeams =
    teams?.filter((team) => {
      const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDivision = selectedDivision === 'all' || (selectedDivision === 'unassigned' && !team.division_id) || team.division_id === selectedDivision;
      return matchesSearch && matchesDivision;
    }) || [];

  const teamStats = {
    total: teams?.length || 0,
    withDivisions: teams?.filter((t) => t.division_id).length || 0,
    unassigned: teams?.filter((t) => !t.division_id).length || 0,
  };

  if (isLoadingTeams || isLoadingDivisions) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <TeamManagementStatsCards teamStats={teamStats} />
      <TeamManagementTabs
        pendingMembershipCount={pendingMembershipCount}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedDivision={selectedDivision}
        setSelectedDivision={setSelectedDivision}
        divisions={divisions}
        filteredTeams={filteredTeams}
        isUpdating={isUpdating}
        setEditingTeam={setEditingTeam}
        handleDivisionChange={handleDivisionChange}
        handleTeamSubmit={handleTeamSubmit}
      />
      <EditTeamDialog team={editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)} onSubmit={handleEditTeam} onCancel={() => setEditingTeam(null)} />
    </div>
  );
};

export default React.memo(TeamManagementTab);
