import React from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

import BracketDetail from '../BracketDetail';
import BracketList from '../BracketList';
import { PlayoffPageData } from '../hooks/usePlayoffPageData';
import TeamDivisionTable from '../TeamDivisionTable';
import PlayoffErrorBanners from './PlayoffErrorBanners';

interface AdminViewProps {
  bracketDialogOpen: boolean;
  setBracketDialogOpen: (open: boolean) => void;
  onCreateBracket: () => void;
  onDeleteBracket: (bracketId: string, bracketName: string) => void;
  /**
   * Opens the match score editor. Owned by PlayoffPageLayout, which also renders
   * the dialog this opens — calling usePlayoffHandlers here instead would create a
   * second, private copy of `editingMatch` that the dialog never reads.
   */
  onEditMatch: (matchId: string) => void;
  data: PlayoffPageData;
}

const PLAYOFF_VIEW_TAB_KEY = 'playoffViewActiveTab';

const AdminView: React.FC<AdminViewProps> = ({
  bracketDialogOpen: _bracketDialogOpen,
  setBracketDialogOpen: _setBracketDialogOpen,
  onCreateBracket,
  onDeleteBracket,
  onEditMatch,
  data,
}) => {
  const [activeTab, setActiveTab] = React.useState(() => {
    return sessionStorage.getItem(PLAYOFF_VIEW_TAB_KEY) || 'brackets';
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    sessionStorage.setItem(PLAYOFF_VIEW_TAB_KEY, tabId);
  };

  const handleCreateBracketClick = () => {
    onCreateBracket();
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      defaultValue="brackets"
      className="space-y-4"
    >
      <TabsList>
        <TabsTrigger value="brackets">Brackets</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
      </TabsList>

      {/*
       * Outside TabsContent on purpose: the Teams tab renders TeamDivisionTable
       * from the same divisions query, so a divisions failure has to be visible
       * there too. Inside the brackets tab it would be hidden on the very tab
       * the error affects most.
       */}
      <PlayoffErrorBanners data={data} />

      <TabsContent value="brackets" className="space-y-6">
        <div className={!data.selectedBracketId || !data.bracket ? 'block' : 'hidden'}>
          <BracketList
            divisions={data.availableDivisions}
            bracketsByDivision={data.typesafeBracketsByDivision}
            onCreateBracket={handleCreateBracketClick}
            onViewBracket={data.setSelectedBracketId}
            onEditBracket={handleCreateBracketClick}
            onDeleteBracket={onDeleteBracket}
            isLoading={data.isLoading}
          />
        </div>

        {data.ready &&
          data.selectedBracketId &&
          data.bracket &&
          data.bracket.id === data.selectedBracketId && (
            <BracketDetail
              bracketId={data.selectedBracketId}
              bracket={data.bracket as unknown as PlayoffBracket}
              teams={data.teams}
              bracketLoading={data.isLoading}
              onEditBracket={handleCreateBracketClick}
              onEditMatch={onEditMatch}
              onDeleteBracket={async (bracketId: string, bracketName: string) => {
                await onDeleteBracket(bracketId, bracketName);
                data.setSelectedBracketId(null);
              }}
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
