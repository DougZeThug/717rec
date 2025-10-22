
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BracketList from "../BracketList";
import BracketView from "../BracketView";
import TeamDivisionTable from "../TeamDivisionTable";
import { ChallongeFallback } from "../embeds/ChallongeFallback";
import { PlayoffPageData } from "../hooks/usePlayoffPageData";
import { usePlayoffHandlers } from "../hooks/usePlayoffHandlers";
import { useChallongeAdmin } from "@/hooks/useChallongeAdmin";

interface AdminViewProps {
  bracketDialogOpen: boolean;
  setBracketDialogOpen: (open: boolean) => void;
  onCreateBracket: () => void;
  onDeleteBracket: (bracketId: string, bracketName: string) => void;
  data: PlayoffPageData;
}

const AdminView: React.FC<AdminViewProps> = ({ 
  bracketDialogOpen,
  setBracketDialogOpen,
  onCreateBracket,
  onDeleteBracket,
  data
}) => {
  const handlers = usePlayoffHandlers(data);
  const { resyncMatches } = useChallongeAdmin();
  const [activeTab, setActiveTab] = React.useState("brackets");

  const handleResyncBracket = (bracketId: string, challongeTournamentId: number) => {
    console.log('🔄 AdminView: Initiating bracket resync:', { bracketId, challongeTournamentId });
    resyncMatches.mutate(
      { bracketId, challongeTournamentId },
      {
        onSuccess: () => {
          console.log('🔄 AdminView: Bracket resync completed successfully');
          // Trigger a refetch of the bracket data
          if (data.selectedBracketId === bracketId) {
            // Force a refresh if this is the currently selected bracket
            window.location.reload();
          }
        },
        onError: (error) => {
          console.error('🔄 AdminView: Bracket resync failed:', error);
        }
      }
    );
  };

  const handleCreateBracketClick = () => {
    console.log('🎯 AdminView: Create bracket button clicked');
    onCreateBracket();
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="brackets" className="space-y-4">
      <TabsList>
        <TabsTrigger value="brackets">Brackets</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
      </TabsList>
      
      <TabsContent value="brackets" className="space-y-6">
        {/* Challonge Fallback - Always show for admins */}
        <div className="mb-8">
          <ChallongeFallback />
        </div>

        <div className={!data.selectedBracketId || !data.bracket ? 'block' : 'hidden'}>
          <BracketList 
            divisions={data.availableDivisions}
            bracketsByDivision={data.typesafeBracketsByDivision}
            onCreateBracket={handleCreateBracketClick}
            onViewBracket={data.setSelectedBracketId}
            onEditBracket={handleCreateBracketClick}
            onDeleteBracket={onDeleteBracket}
            onResyncBracket={handleResyncBracket}
            isResyncLoading={resyncMatches.isPending}
            isLoading={data.isLoading}
          />
        </div>

        <div className={data.selectedBracketId && data.bracket ? 'block' : 'hidden'}>
          <BracketView 
            bracketId={data.selectedBracketId}
            onEditMatch={handlers.handleEditMatch}
          />
        </div>
      </TabsContent>
      
      <TabsContent value="teams">
        <TeamDivisionTable 
          divisions={data.availableDivisions} 
          teams={data.teams}
          isLoading={data.isLoading}
        />
      </TabsContent>
    </Tabs>
  );
};

export default AdminView;
