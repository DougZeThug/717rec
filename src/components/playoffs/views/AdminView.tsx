
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlayoffAdminSection from "@/components/playoffs/admin/PlayoffAdminSection";
import PlayoffPageContent from "@/components/playoffs/PlayoffPageContent";
import { PlayoffBracket, Team } from "@/types";

interface AdminViewProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  availableDivisions: string[];
  bracketsByDivision: Record<string, Partial<PlayoffBracket>[]>;
  selectedBracketId: string | null;
  bracket: PlayoffBracket;
  teams: Team[];
  bracketLoading: boolean;
  allBracketsData: Partial<PlayoffBracket>[];
  isLoading: boolean;
  onCreateBracket: () => void;
  onViewBracket: (id: string) => void;
  onEditBracket: () => void;
  onEditMatch: (matchId: string) => void;
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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="my-4">
      <TabsList>
        <TabsTrigger value="view">Bracket View</TabsTrigger>
        <TabsTrigger value="admin">Admin</TabsTrigger>
      </TabsList>
      
      <TabsContent value="view" className="pt-2">
        <PlayoffPageContent
          availableDivisions={availableDivisions}
          bracketsByDivision={bracketsByDivision}
          selectedBracketId={selectedBracketId}
          bracket={bracket}
          teams={teams}
          bracketLoading={bracketLoading}
          allBracketsData={allBracketsData}
          isLoading={isLoading}
          onCreateBracket={onCreateBracket}
          onViewBracket={onViewBracket}
          onEditBracket={onEditBracket}
          onEditMatch={onEditMatch}
          onDeleteBracket={onDeleteBracket}
        />
      </TabsContent>
      
      <TabsContent value="admin" className="pt-2">
        <PlayoffAdminSection
          bracket={bracket}
          teams={teams}
          onEditMatch={onEditMatch}
        />
      </TabsContent>
    </Tabs>
  );
};

export default AdminView;
