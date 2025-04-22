import React, { useState, useEffect, useMemo } from 'react';
import { Team } from "@/types";
import { TeamDeleteDialog } from "@/components/teams/TeamDeleteDialog";
import { TeamList } from "@/components/teams/TeamList";
import { TeamsByDivision } from "@/components/teams/TeamsByDivision";
import { TeamEditForm } from "@/components/teams/TeamEditForm";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { useDivisions } from "@/hooks/useDivisions";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from 'framer-motion';
import TeamsSortToggle, { SortMode } from './TeamsSortToggle';
import { DisplayMode } from "./TeamsPageContainer";

// State for sort mode
const SORT_MODES = [
  { key: 'rank', label: 'Rank' },
  { key: 'alpha', label: 'A–Z' }
] as const;

interface TeamsContainerProps {
  displayMode: DisplayMode;
}

const TeamsContainer: React.FC<TeamsContainerProps> = ({ displayMode }) => {
  const { 
    teams, 
    isLoading, 
    teamToEdit, 
    setTeamToEdit,
    deleteTeamId, 
    setDeleteTeamId, 
    isRefreshing,
    isDeleting,
    handleUpdateTeam,
    handleDeleteTeam,
    handleRefresh
  } = useTeamManagement();
  
  const { divisions } = useDivisions();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useIsMobile();

  // Sort mode state, persisted to localStorage
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("teamsSortMode") as SortMode) || "rank";
    }
    return "rank";
  });

  useEffect(() => {
    localStorage.setItem("teamsSortMode", sortMode);
  }, [sortMode]);
  
  // Handle scroll effect for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Deduplicate teams array first
  const uniqueTeams = useMemo(() => {
    const uniqueTeamMap = new Map<string, Team>();
    teams.forEach(team => {
      if (!uniqueTeamMap.has(team.id)) {
        uniqueTeamMap.set(team.id, team);
      }
    });
    return Array.from(uniqueTeamMap.values());
  }, [teams]);
  
  // Group teams by division
  const teamsByDivision = useMemo(() => {
    const grouped: Record<string, Team[]> = {
      unassigned: []
    };
    divisions.forEach(division => {
      grouped[division.id] = [];
    });
    uniqueTeams.forEach(team => {
      if (!team.division) {
        grouped.unassigned.push(team);
      } else {
        if (!grouped[team.division]) {
          grouped[team.division] = [];
        }
        grouped[team.division].push(team);
      }
    });
    return grouped;
  }, [uniqueTeams, divisions]);

  // Sorting utils (fix rank sort to use powerScore)
  const sortTeams = (arr: Team[]) => {
    if (sortMode === "alpha") {
      return [...arr].sort((a, b) => 
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
    } 
    // sort by powerScore (descending)
    return [...arr].sort((a, b) => (b.powerScore ?? 0) - (a.powerScore ?? 0));
  };

  // For grouped mode, apply sorting to each division group
  const sortedTeamsByDivision = useMemo(() => {
    const sorted: Record<string, Team[]> = {};
    for (const divId of Object.keys(teamsByDivision)) {
      sorted[divId] = sortTeams(teamsByDivision[divId]);
    }
    return sorted;
  }, [teamsByDivision, sortMode]);

  // For all teams mode, apply sort to all
  const sortedAllTeams = useMemo(() => sortTeams(uniqueTeams), [uniqueTeams, sortMode]);
  
  // Get division name by ID
  const getDivisionName = (divisionId: string | undefined): string => {
    if (!divisionId || divisionId === "unassigned") return "Unassigned Division";
    const division = divisions.find(d => d.id === divisionId);
    return division ? division.name : "Unknown Division";
  };

  return (
    <div>
      {/* Remove filter, keep layout as before */}
      <div className={`${scrolled ? 'shadow-md' : ''} transition-shadow sticky top-0 z-30 bg-background/95 backdrop-blur-sm pb-2`}>
        {/* Move TeamsHeader up in page container */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Display mode toggle moved to parent container */}
        </div>
        <TeamsSortToggle sortMode={sortMode} setSortMode={setSortMode} />
      </div>
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
          key={`${viewMode}-${displayMode}-${sortMode}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {displayMode === "grouped" ? (
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
