import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';

import { TeamDeleteDialog } from '@/components/teams/TeamDeleteDialog';
import { TeamEditForm } from '@/components/teams/TeamEditForm';
import { TeamList } from '@/components/teams/TeamList';
import { TeamsByDivision } from '@/components/teams/TeamsByDivision';
import { useDivisions } from '@/hooks/useDivisions';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { Team } from '@/types';
import { groupTeamsByDisplayDivision } from '@/utils/teamGrouping';

import { DisplayMode, SortMode } from './TeamsPageContainer';

interface TeamsContainerProps {
  displayMode: DisplayMode;
  viewMode: 'grid' | 'list';
  sortMode: SortMode;
}

const TeamsContainer: React.FC<TeamsContainerProps> = ({ displayMode, viewMode, sortMode }) => {
  const {
    teams,
    isLoading,
    teamToEdit,
    setTeamToEdit,
    deleteTeamId,
    setDeleteTeamId,
    isDeleting,
    handleUpdateTeam,
    handleDeleteTeam,
  } = useTeamManagement();

  const { divisions } = useDivisions();

  const uniqueTeams = useMemo(() => {
    const uniqueTeamMap = new Map<string, Team>();
    teams.forEach((team) => {
      if (!uniqueTeamMap.has(team.id)) {
        uniqueTeamMap.set(team.id, team);
      }
    });
    return Array.from(uniqueTeamMap.values());
  }, [teams]);

  // Group teams by display division instead of actual division_id
  const teamsByDisplayDivision = useMemo(() => {
    return groupTeamsByDisplayDivision(uniqueTeams, divisions);
  }, [uniqueTeams, divisions]);

  const sortTeams = (arr: Team[]) => {
    if (sortMode === 'alpha') {
      return [...arr].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    }
    return [...arr].sort((a, b) => (b.power_score ?? 0) - (a.power_score ?? 0));
  };

  const sortedTeamsByDivision = useMemo(() => {
    const sorted: Record<string, Team[]> = {};
    for (const displayDivision of Object.keys(teamsByDisplayDivision)) {
      sorted[displayDivision] = sortTeams(teamsByDisplayDivision[displayDivision]);
    }
    return sorted;
  }, [teamsByDisplayDivision, sortMode]);

  const sortedAllTeams = useMemo(() => sortTeams(uniqueTeams), [uniqueTeams, sortMode]);

  // Updated to work with display divisions
  const getDivisionName = (displayDivision: string | undefined): string => {
    if (!displayDivision) return 'Unassigned Division';
    return `${displayDivision} Division`;
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {teamToEdit && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <TeamEditForm
              team={teamToEdit}
              onSubmit={handleUpdateTeam}
              onCancel={() => setTeamToEdit(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${displayMode}-${sortMode}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {displayMode === 'grouped' ? (
            <TeamsByDivision
              teamsByDivision={sortedTeamsByDivision}
              getDivisionName={getDivisionName}
              onEditTeam={setTeamToEdit}
              onDeleteTeam={setDeleteTeamId}
              isLoading={isLoading}
              viewMode={viewMode}
              sortMode={sortMode}
            />
          ) : (
            <TeamList
              teams={sortedAllTeams}
              isLoading={isLoading}
              onEdit={setTeamToEdit}
              onDelete={setDeleteTeamId}
              viewMode={viewMode}
            />
          )}
        </motion.div>
      </AnimatePresence>
      <TeamDeleteDialog
        isOpen={!!deleteTeamId}
        onClose={() => setDeleteTeamId(null)}
        onConfirm={handleDeleteTeam}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default TeamsContainer;
