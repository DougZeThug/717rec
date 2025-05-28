
import React from "react";
import { Loader2 } from "lucide-react";
import AdminView from "@/components/playoffs/views/AdminView";
import PlayoffView from "@/components/playoffs/views/PlayoffView";
import BracketView from "@/components/playoffs/BracketView";
import PlayoffPageLayout from "@/components/playoffs/layout/PlayoffPageLayout";
import { usePlayoffPageData } from "@/components/playoffs/hooks/usePlayoffPageData";
import { usePlayoffHandlers } from "@/components/playoffs/hooks/usePlayoffHandlers";
import { usePlayoffViewState } from "@/components/playoffs/hooks/usePlayoffViewState";

const Playoffs = () => {
  // Use extracted hooks for data, handlers, and view state
  const data = usePlayoffPageData();
  const handlers = usePlayoffHandlers(data);
  const view = usePlayoffViewState(data, handlers);

  // Handle Challonge bracket display
  if (data.bracket?.challonge_tournament_id) {
    if (data.challongeBracket.isLoading || !data.challongeBracket.matches || !data.challongeBracket.participants) {
      return (
        <PlayoffPageLayout data={data} view={view} handlers={handlers}>
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-cornhole-navy animate-spin mb-2" />
            <p>Loading Challonge tournament...</p>
          </div>
        </PlayoffPageLayout>
      );
    }

    return (
      <PlayoffPageLayout data={data} view={view} handlers={handlers}>
        <BracketView
          matches={data.challongeBracket.matches}
          participants={data.challongeBracket.participants}
        />
      </PlayoffPageLayout>
    );
  }

  return (
    <PlayoffPageLayout data={data} view={view} handlers={handlers}>
      {/* Admin View with Tabs */}
      {data.bracket && data.isAdmin && (
        <AdminView
          activeTab={view.activeTab}
          setActiveTab={view.setActiveTab}
          availableDivisions={data.availableDivisions}
          bracketsByDivision={data.typesafeBracketsByDivision}
          selectedBracketId={data.selectedBracketId}
          bracket={data.bracket}
          teams={data.teams}
          bracketLoading={data.isLoading}
          allBracketsData={data.allBracketsData}
          isLoading={data.isLoading}
          onCreateBracket={view.handleCreateBracket}
          onViewBracket={data.setSelectedBracketId}
          onEditBracket={view.handleCreateBracket}
          onEditMatch={handlers.handleEditMatchClick}
          onDeleteBracket={data.isAdmin ? view.handleDeleteBracket : undefined}
        />
      )}
      
      {/* Regular View */}
      {(!data.bracket || !data.isAdmin) && (
        <PlayoffView
          availableDivisions={data.availableDivisions}
          bracketsByDivision={data.typesafeBracketsByDivision}
          selectedBracketId={data.selectedBracketId}
          bracket={data.bracket}
          teams={data.teams}
          bracketLoading={data.isLoading}
          allBracketsData={data.allBracketsData}
          isLoading={data.isLoading}
          onCreateBracket={view.handleCreateBracket}
          onViewBracket={data.setSelectedBracketId}
          onEditBracket={view.handleCreateBracket}
          onEditMatch={handlers.handleEditMatchClick}
          onDeleteBracket={data.isAdmin ? view.handleDeleteBracket : undefined}
        />
      )}
    </PlayoffPageLayout>
  );
};

export default Playoffs;
