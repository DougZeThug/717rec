
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayoffRealtime } from "@/hooks/usePlayoffRealtime";
import { usePlayoffState } from "@/hooks/playoffs/usePlayoffState";
import { usePlayoffEditMatch } from "@/hooks/playoffs/usePlayoffEditMatch";
import { usePlayoffViewModel } from "@/hooks/playoffs/usePlayoffViewModel";
import { useDivisions } from "@/hooks/useDivisions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PlayoffHeader from "@/components/playoffs/PlayoffHeader";
import RealtimeIndicator from "@/components/playoffs/indicators/RealtimeIndicator";
import PlayoffDialogs from "@/components/playoffs/dialogs/PlayoffDialogs";
import BracketList from "./BracketList";
import BracketViewer from "./bracket-viewer/BracketViewer";
import { transformToBracketViewerFormat } from "./bracket-viewer/dataTransformer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamDivisionTable from "./TeamDivisionTable";
import { PlayoffBracket, PlayoffMatch, Team } from "@/types";
import { BracketFormat, BRACKET_FORMATS, BRACKET_STATES, BracketState } from "@/constants/brackets";
import { transformMatches } from "@/utils/matchTransformer";

const PlayoffsUnified = () => {
  const {
    selectedBracketId, setSelectedBracketId,
    teamDialogOpen, setTeamDialogOpen,
    bracketDialogOpen, setBracketDialogOpen,
    activeTab, setActiveTab,
    deletingBracket, setDeletingBracket,
    isDeleting, setIsDeleting
  } = usePlayoffState();
  
  const { editingMatch, isQuickEdit, handleEditMatch, handleCloseMatchEditor, handleSaveMatchScore } = usePlayoffEditMatch();

  const { profile } = useAuth();
  const isAdmin = profile?.is_admin || false;

  // Use our unified view model hook for the selected bracket
  const {
    bracket,
    isLoading: bracketLoading,
    teams,
    teamsLoading,
    deleteBracket
  } = usePlayoffViewModel(selectedBracketId);
  
  // Fetch divisions directly
  const { divisions, isLoading: divisionsLoading } = useDivisions();
  
  // Fetch all brackets for the list view
  const { data: allBrackets = [], isLoading: bracketsLoading, refetch: refetchBrackets } = useQuery({
    queryKey: ['brackets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brackets')
        .select('*, playoff_matches(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match our PlayoffBracket type
      return data.map(bracket => {
        // Transform the matches to our PlayoffMatch format
        const transformedMatches: PlayoffMatch[] = transformMatches(bracket.playoff_matches || []);
        
        return {
          id: bracket.id,
          name: bracket.title || 'Unnamed Bracket',
          division: bracket.division_id,
          format: (bracket.format || BRACKET_FORMATS.DOUBLE) as BracketFormat,
          state: (bracket.state || BRACKET_STATES.PENDING) as BracketState,
          matches: transformedMatches,
          created_at: bracket.created_at
        } as PlayoffBracket;
      });
    }
  });

  // Subscribe to real-time updates for the selected bracket
  const { realtimeEnabled, lastUpdatedMatch } = usePlayoffRealtime(selectedBracketId);
  
  // Refetch bracket data when we receive a real-time update
  React.useEffect(() => {
    if (lastUpdatedMatch && selectedBracketId) {
      refetchBrackets();
    }
  }, [lastUpdatedMatch, refetchBrackets, selectedBracketId]);

  // Group brackets by division for display
  const bracketsByDivision = React.useMemo(() => {
    const grouped: Record<string, PlayoffBracket[]> = {};
    
    if (divisions && allBrackets) {
      divisions.forEach(division => {
        grouped[division.name] = allBrackets.filter(bracket => 
          bracket.division === division.id
        );
      });
    }
    
    return grouped;
  }, [allBrackets, divisions]);

  // Transform bracket data for brackets-viewer if we have a selected bracket
  const bracketViewerData = React.useMemo(() => {
    if (!bracket || !teams) return null;
    
    // Fix: ensure format is passed correctly to the transformer
    return transformToBracketViewerFormat(
      bracket.matches,
      teams,
      bracket.format === BRACKET_FORMATS.SINGLE ? BRACKET_FORMATS.SINGLE : BRACKET_FORMATS.DOUBLE
    );
  }, [bracket, teams]);

  // Event handlers
  const handleCreateBracket = () => {
    setBracketDialogOpen(true);
  };
  
  const handleEditMatchClick = (matchId: string, quickEdit: boolean = false) => {
    handleEditMatch(matchId, quickEdit)(bracket);
  };

  const handleDeleteBracket = (bracketId: string, bracketName: string) => {
    setDeletingBracket({ id: bracketId, name: bracketName });
  };
  
  const handleConfirmDeleteBracket = async () => {
    if (!deletingBracket) return;
    
    await deleteBracket(
      deletingBracket.id,
      deletingBracket.name,
    );
    
    // Reset selected bracket if we're deleting the current one
    if (selectedBracketId === deletingBracket.id) {
      setSelectedBracketId(null);
    }
    
    setDeletingBracket(null);
  };
  
  const handleSaveScore = async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ) => {
    await handleSaveMatchScore(
      matchId, 
      team1Score, 
      team2Score, 
      games, 
      team1GameWins, 
      team2GameWins,
      refetchBrackets
    );
  };

  const isLoading = bracketsLoading || divisionsLoading || teamsLoading || bracketLoading;
  const availableDivisions = divisions?.map(div => div.name) || [];

  return (
    <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <PlayoffHeader 
          onCreateBracket={handleCreateBracket} 
          onOpenTeamDialog={() => setTeamDialogOpen(true)} 
        />
        
        {/* Show bracket viewer if a bracket is selected */}
        {bracket && bracketViewerData ? (
          <div className="mt-8">
            <div className="mb-4">
              <button
                onClick={() => setSelectedBracketId(null)}
                className="text-blue-600 hover:text-blue-800 mb-4"
              >
                ← Back to Brackets
              </button>
              <h2 className="text-2xl font-bold">{bracket.name || 'Tournament Bracket'}</h2>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <BracketViewer
                bracketData={bracketViewerData}
                onMatchClick={handleEditMatchClick}
                className="min-h-[500px]"
              />
            </div>
          </div>
        ) : (
          /* Show bracket list and admin tabs when no bracket is selected */
          <div className="space-y-6">
            {isAdmin && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                  <TabsTrigger value="view">Brackets</TabsTrigger>
                  <TabsTrigger value="teams">Teams</TabsTrigger>
                </TabsList>
                
                <TabsContent value="view" className="space-y-6">
                  <BracketList 
                    divisions={availableDivisions}
                    bracketsByDivision={bracketsByDivision}
                    onCreateBracket={handleCreateBracket}
                    onViewBracket={setSelectedBracketId}
                    onEditBracket={handleCreateBracket}
                    onDeleteBracket={isAdmin ? handleDeleteBracket : undefined}
                    isLoading={isLoading}
                  />
                </TabsContent>
                
                <TabsContent value="teams">
                  <TeamDivisionTable 
                    divisions={availableDivisions} 
                    teams={teams || []}
                    isLoading={isLoading}
                  />
                </TabsContent>
              </Tabs>
            )}
            
            {!isAdmin && (
              <BracketList 
                divisions={availableDivisions}
                bracketsByDivision={bracketsByDivision}
                onCreateBracket={handleCreateBracket}
                onViewBracket={setSelectedBracketId}
                onEditBracket={handleCreateBracket}
                onDeleteBracket={undefined}
                isLoading={isLoading}
              />
            )}
          </div>
        )}
        
        {/* Realtime indicator */}
        <RealtimeIndicator enabled={!!realtimeEnabled && !!selectedBracketId} />
      </div>

      {/* All dialogs */}
      <PlayoffDialogs
        // Team division dialog props
        teamDialogOpen={teamDialogOpen}
        setTeamDialogOpen={setTeamDialogOpen}
        teamsByDivision={{}} // We'll implement this properly in the next phase
        availableDivisions={availableDivisions}
        teamsLoading={teamsLoading}
        onTeamDivisionChange={async () => {}} // Placeholder
        
        // Bracket creation dialog props
        bracketDialogOpen={bracketDialogOpen}
        setBracketDialogOpen={setBracketDialogOpen}
        divisions={divisions || []}
        teams={teams || []}
        onBracketCreated={async () => {
          refetchBrackets();
          setBracketDialogOpen(false);
        }}
        
        // Match editor props
        editingMatch={editingMatch}
        isQuickEdit={isQuickEdit}
        onCloseMatchEditor={handleCloseMatchEditor}
        onSaveMatchScore={handleSaveScore}
        
        // Delete bracket props
        deletingBracket={deletingBracket}
        setDeletingBracket={setDeletingBracket}
        onConfirmDelete={handleConfirmDeleteBracket}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default PlayoffsUnified;
