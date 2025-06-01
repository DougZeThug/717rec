
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BracketList from "../BracketList";
import BracketView from "../BracketView";
import TeamDivisionTable from "../TeamDivisionTable";
import { ChallongeFallback } from "../embeds/ChallongeFallback";
import { usePlayoffPageData } from "../hooks/usePlayoffPageData";
import { usePlayoffHandlers } from "../hooks/usePlayoffHandlers";
import { usePlayoffViewState } from "../hooks/usePlayoffViewState";
import { useChallongeAdmin } from "@/hooks/useChallongeAdmin";

const AdminView: React.FC = () => {
  const data = usePlayoffPageData();
  const handlers = usePlayoffHandlers(data);
  const view = usePlayoffViewState(data, handlers, "brackets");
  const { resyncMatches } = useChallongeAdmin();

  const handleResyncBracket = (bracketId: string, challongeTournamentId: number) => {
    resyncMatches.mutate({ bracketId, challongeTournamentId });
  };

  return (
    <Tabs value={view.activeTab} onValueChange={view.setActiveTab} defaultValue="brackets" className="space-y-4">
      <TabsList>
        <TabsTrigger value="brackets">Brackets</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
      </TabsList>
      
      <TabsContent value="brackets" className="space-y-6">
        {/* Challonge Fallback - Always show for admins */}
        <div className="mb-8">
          <ChallongeFallback />
        </div>

        {!data.selectedBracketId || !data.bracket ? (
          <BracketList 
            divisions={data.availableDivisions}
            bracketsByDivision={data.typesafeBracketsByDivision}
            onCreateBracket={view.handleCreateBracket}
            onViewBracket={data.setSelectedBracketId}
            onEditBracket={view.handleCreateBracket}
            onDeleteBracket={view.handleDeleteBracket}
            onResyncBracket={handleResyncBracket}
            isResyncLoading={resyncMatches.isPending}
            isLoading={data.isLoading}
          />
        ) : (
          <BracketView 
            bracket={data.bracket} 
            teams={data.teams}
            onEditMatch={handlers.handleEditMatch}
          />
        )}
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
