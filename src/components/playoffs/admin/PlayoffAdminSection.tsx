import React, { useMemo, useState } from 'react';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayoffBracket, Team } from '@/types';

import EditMatchParticipantsDialog from './EditMatchParticipantsDialog';
import PlayoffMatchList from './PlayoffMatchList';

interface PlayoffAdminSectionProps {
  bracket: PlayoffBracket;
  teams: Team[];
  onEditMatch: (matchId: string, quickEdit: boolean) => void;
}

const PLAYOFF_ADMIN_TAB_KEY = 'playoffAdminActiveTab';

const PlayoffAdminSection: React.FC<PlayoffAdminSectionProps> = ({
  bracket,
  teams,
  onEditMatch,
}) => {
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem(PLAYOFF_ADMIN_TAB_KEY) || 'matches';
  });

  const [editTeamsMatchId, setEditTeamsMatchId] = useState<string | null>(null);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    sessionStorage.setItem(PLAYOFF_ADMIN_TAB_KEY, tabId);
  };

  // Group matches by type for the different tabs
  const winnerMatches = (bracket.matches ?? []).filter((m) => m.matchType === 'winners');
  const loserMatches = (bracket.matches ?? []).filter((m) => m.matchType === 'losers');
  const finalMatches = (bracket.matches ?? []).filter((m) => m.matchType === 'finals');
  const playInMatches = (bracket.matches ?? []).filter((m) => m.matchType === 'play-in');

  // Look up the match currently being edited so we can pass its current teams into the dialog
  const editingMatch = useMemo(
    () =>
      editTeamsMatchId ? (bracket.matches ?? []).find((m) => m.id === editTeamsMatchId) : null,
    [editTeamsMatchId, bracket.matches]
  );

  // Only brackets-manager brackets have numeric match IDs on the 'match' table.
  // If this bracket is legacy (uses_brackets_manager !== true), skip the Teams action.
  const supportsTeamEdit = bracket.uses_brackets_manager === true;
  const handleEditTeams = supportsTeamEdit ? setEditTeamsMatchId : undefined;

  const editingMatchIdNumber =
    editingMatch && /^\d+$/.test(editingMatch.id) ? Number(editingMatch.id) : null;

  return (
    <Card className="border rounded-lg overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="matches">All Matches</TabsTrigger>
          <TabsTrigger value="winners">Winners Bracket</TabsTrigger>
          <TabsTrigger value="losers">Losers Bracket</TabsTrigger>
          <TabsTrigger value="finals">Finals</TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          <PlayoffMatchList
            matches={bracket.matches ?? []}
            teams={teams}
            onEditMatch={onEditMatch}
            onEditTeams={handleEditTeams}
            title={`All Matches - ${bracket.name}`}
          />
        </TabsContent>

        <TabsContent value="winners">
          <PlayoffMatchList
            matches={winnerMatches}
            teams={teams}
            onEditMatch={onEditMatch}
            onEditTeams={handleEditTeams}
            title="Winners Bracket"
            matchTypeFilter="winners"
          />
        </TabsContent>

        <TabsContent value="losers">
          <PlayoffMatchList
            matches={loserMatches}
            teams={teams}
            onEditMatch={onEditMatch}
            onEditTeams={handleEditTeams}
            title="Losers Bracket"
            matchTypeFilter="losers"
          />
        </TabsContent>

        <TabsContent value="finals">
          <PlayoffMatchList
            matches={[...finalMatches, ...playInMatches]}
            teams={teams}
            onEditMatch={onEditMatch}
            onEditTeams={handleEditTeams}
            title="Finals & Play-in Matches"
          />
        </TabsContent>
      </Tabs>

      {supportsTeamEdit && (
        <EditMatchParticipantsDialog
          open={editTeamsMatchId !== null && editingMatchIdNumber !== null}
          onOpenChange={(open) => {
            if (!open) setEditTeamsMatchId(null);
          }}
          bracketId={bracket.id}
          matchId={editingMatchIdNumber}
          currentTeam1Id={editingMatch?.team1Id ?? null}
          currentTeam2Id={editingMatch?.team2Id ?? null}
          teams={teams}
        />
      )}
    </Card>
  );
};

export default PlayoffAdminSection;
