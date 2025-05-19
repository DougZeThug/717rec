
import React from "react";
import { PlayoffBracket, Team } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BracketList from "../BracketList";
import BracketView from "../BracketView";
import TeamDivisionTable from "../TeamDivisionTable";
import MigrationTab from "../admin/MigrationTab";

interface AdminViewProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  availableDivisions: string[];
  bracketsByDivision: Record<string, PlayoffBracket[]>;
  selectedBracketId: string | null;
  bracket: PlayoffBracket | null;
  teams: Team[];
  bracketLoading: boolean;
  allBracketsData: PlayoffBracket[];
  isLoading: boolean;
  onCreateBracket: () => void;
  onViewBracket: (id: string) => void;
  onEditBracket: () => void;
  onEditMatch: (matchId: string, quickEdit?: boolean) => void;
  onDeleteBracket?: (id: string, name: string) => void;
}

const AdminView: React.FC<AdminViewProps> = ({
  activeTab,
  setActiveTab,
  availableDivisions,
  bracketsByDivision,
  selectedBracketId,
  bracket,
  teams,
  bracketLoading,
  allBracketsData,
  isLoading,
  onCreateBracket,
  onViewBracket,
  onEditBracket,
  onEditMatch,
  onDeleteBracket
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="brackets">Brackets</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="migration">Migration</TabsTrigger>
      </TabsList>
      
      <TabsContent value="brackets" className="space-y-6">
        {!selectedBracketId || !bracket ? (
          <BracketList 
            divisions={availableDivisions}
            bracketsByDivision={bracketsByDivision}
            onCreateBracket={onCreateBracket}
            onViewBracket={onViewBracket}
            onEditBracket={onEditBracket}
            onDeleteBracket={onDeleteBracket}
            isLoading={isLoading}
          />
        ) : (
          <BracketView 
            bracket={bracket} 
            teams={teams}
            onEditMatch={onEditMatch}
          />
        )}
      </TabsContent>
      
      <TabsContent value="teams">
        <TeamDivisionTable 
          divisions={availableDivisions} 
          teams={teams}
          isLoading={isLoading}
        />
      </TabsContent>
      
      <TabsContent value="migration">
        <MigrationTab />
      </TabsContent>
    </Tabs>
  );
};

export default AdminView;
