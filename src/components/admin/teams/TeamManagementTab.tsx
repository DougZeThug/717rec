import { motion } from 'framer-motion';
import { Edit, Image, Plus, Search, Settings, UserCheck, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import TeamForm from '@/components/teams/TeamForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamsQuery } from '@/hooks/teams';
import { useDivisions } from '@/hooks/useDivisions';
import { useTeams } from '@/hooks/useTeams';
import { useToast } from '@/hooks/useToast';
import { fetchPendingMembershipCount, updateTeamApi } from '@/services/TeamService';
import { Team } from '@/types';
import { errorLog } from '@/utils/logger';

import BulkLogoUpdateTab from './BulkLogoUpdateTab';
import TeamMembershipApprovalTab from './TeamMembershipApprovalTab';

const TeamManagementTab = () => {
  const { toast } = useToast();
  const { createTeam } = useTeams();
  const {
    data: teams,
    isLoading: isLoadingTeams,
    refetch: refetchTeams,
  } = useTeamsQuery({ includeHidden: true });
  const { divisions, isLoading: isLoadingDivisions } = useDivisions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [pendingMembershipCount, setPendingMembershipCount] = useState(0);

  useEffect(() => {
    fetchPendingMembershipCount().then((count) => {
      setPendingMembershipCount(count);
    });
  }, []);

  const handleTeamSubmit = async (teamData: Omit<Team, 'id' | 'created_at'>) => {
    try {
      const newTeam = await createTeam(teamData);
      toast({
        title: 'Team Created',
        description: `${newTeam.name} has been successfully created.`,
      });
      refetchTeams();
    } catch (error) {
      errorLog('Error creating team:', error);
    }
  };

  const handleEditTeam = async (teamData: Omit<Team, 'id' | 'created_at'>) => {
    if (!editingTeam) return;
    try {
      await updateTeamApi(editingTeam.id, teamData);
      toast({
        title: 'Team Updated',
        description: `${teamData.name} has been successfully updated.`,
      });
      setEditingTeam(null);
      refetchTeams();
    } catch (error) {
      errorLog('Error updating team:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update team. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDivisionChange = async (teamId: string, newDivisionId: string | null) => {
    setIsUpdating(teamId);
    try {
      const team = teams?.find((t) => t.id === teamId);
      if (!team) return;

      await updateTeamApi(teamId, {
        ...team,
        division_id: newDivisionId,
      });

      toast({
        title: 'Division Updated',
        description: `Team division has been updated successfully.`,
      });
      refetchTeams();
    } catch (error) {
      errorLog('Error updating team division:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update team division. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredTeams =
    teams?.filter((team) => {
      const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDivision =
        selectedDivision === 'all' ||
        (selectedDivision === 'unassigned' && !team.division_id) ||
        team.division_id === selectedDivision;
      return matchesSearch && matchesDivision;
    }) || [];

  const teamStats = {
    total: teams?.length || 0,
    withDivisions: teams?.filter((t) => t.division_id).length || 0,
    unassigned: teams?.filter((t) => !t.division_id).length || 0,
  };

  if (isLoadingTeams || isLoadingDivisions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center space-x-2">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{teamStats.total}</p>
              <p className="text-sm text-muted-foreground">Total Teams</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-2">
            <Settings className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{teamStats.withDivisions}</p>
              <p className="text-sm text-muted-foreground">Assigned to Divisions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-2">
            <Edit className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">{teamStats.unassigned}</p>
              <p className="text-sm text-muted-foreground">Unassigned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manage">Manage Teams</TabsTrigger>
          <TabsTrigger value="create">Create Team</TabsTrigger>
          <TabsTrigger value="logos" className="gap-1.5">
            <Image className="h-3.5 w-3.5" />
            Update Logos
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            Member Approvals
            {pendingMembershipCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {pendingMembershipCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {divisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mobile Card List */}
              <div className="space-y-3 sm:hidden">
                {filteredTeams.map((team) => (
                  <div
                    key={team.id}
                    className="border border-border rounded-lg p-3 space-y-2 bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate mr-2">{team.name}</span>
                      <motion.div whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTeam(team)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        {team.wins}-{team.losses} ({team.game_wins}-{team.game_losses})
                      </span>
                      <span>·</span>
                      <span>{team.players?.length || 0} players</span>
                    </div>
                    <Select
                      value={team.division_id || 'unassigned'}
                      onValueChange={(value) =>
                        handleDivisionChange(team.id, value === 'unassigned' ? null : value)
                      }
                      disabled={isUpdating === team.id}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <Badge variant="secondary">Unassigned</Badge>
                        </SelectItem>
                        {divisions.map((division) => (
                          <SelectItem key={division.id} value={division.id}>
                            {division.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="border rounded-lg hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Record</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead>Players</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeams.map((team) => (
                      <TableRow
                        key={team.id}
                        className="transition-colors duration-150 hover:bg-muted/50 active:bg-muted"
                      >
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {team.wins}-{team.losses} ({team.game_wins}-{team.game_losses})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={team.division_id || 'unassigned'}
                            onValueChange={(value) =>
                              handleDivisionChange(team.id, value === 'unassigned' ? null : value)
                            }
                            disabled={isUpdating === team.id}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                <Badge variant="secondary">Unassigned</Badge>
                              </SelectItem>
                              {divisions.map((division) => (
                                <SelectItem key={division.id} value={division.id}>
                                  {division.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {team.players?.length || 0} players
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <motion.div whileTap={{ scale: 0.9 }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingTeam(team)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </motion.div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredTeams.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No teams found matching your criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TeamForm onSubmit={handleTeamSubmit} onCancel={() => {}} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logos">
          <BulkLogoUpdateTab />
        </TabsContent>

        <TabsContent value="approvals">
          <TeamMembershipApprovalTab />
        </TabsContent>
      </Tabs>

      {/* Edit Team Dialog */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Team: {editingTeam?.name}</DialogTitle>
          </DialogHeader>
          {editingTeam && (
            <TeamForm
              team={editingTeam}
              onSubmit={handleEditTeam}
              onCancel={() => setEditingTeam(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default React.memo(TeamManagementTab);
