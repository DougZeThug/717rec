import React from 'react';

import BracketDetail from '@/components/playoffs/BracketDetail';
import BracketList from '@/components/playoffs/BracketList';
import type { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

import { PlayoffPageData } from '../hooks/usePlayoffPageData';
import { PlayoffLoadingView } from '../layout/PlayoffLoadingView';
import BackToBracketsButton from './BackToBracketsButton';
import PlayoffErrorBanners from './PlayoffErrorBanners';

interface PlayoffViewProps {
  bracketDialogOpen: boolean;
  setBracketDialogOpen: (open: boolean) => void;
  onCreateBracket: () => void;
  onDeleteBracket: (bracketId: string, bracketName: string) => void;
  data: PlayoffPageData;
}

const PlayoffView: React.FC<PlayoffViewProps> = ({
  bracketDialogOpen: _bracketDialogOpen,
  setBracketDialogOpen: _setBracketDialogOpen,
  onCreateBracket,
  onDeleteBracket,
  data,
}) => {
  const handleCreateBracketClick = () => {
    onCreateBracket();
  };

  // A bracket was chosen and its data is still on the way. `undefined` is "not
  // here yet"; `null` is "loaded, and there is nothing" (a legacy or removed
  // bracket), which must not wait for ever. A failure has its own banner.
  const bracketLoading =
    Boolean(data.selectedBracketId) && data.bracket === undefined && !data.selectedBracketError;
  const showList = !bracketLoading && (!data.selectedBracketId || !data.bracket);

  return (
    <>
      <PlayoffErrorBanners data={data} />

      {/* Whenever the list is hidden (the spinner below, then the open bracket) the
          reader needs a way back. Only the "Loading bracket" error banner
          (data.selectedBracketError) has its own "Back to brackets"; the other banners
          do not. So this one stays out while that banner shows: the list is back, or a
          loaded bracket stays up after a failed refresh. The page keeps exactly one. */}
      {!showList && !data.selectedBracketError && (
        <BackToBracketsButton onBack={() => data.setSelectedBracketId(null)} />
      )}

      {/* Tapping "View Live Bracket" used to leave the division list on screen
          until the bracket arrived, which looked like the tap had done nothing. */}
      {bracketLoading && <PlayoffLoadingView label="Loading bracket..." />}

      {/* Show BracketList only when no bracket is selected */}
      <div className={showList ? 'block' : 'hidden'}>
        <BracketList
          divisions={data.availableDivisions}
          bracketsByDivision={data.typesafeBracketsByDivision}
          onCreateBracket={data.isAdmin ? handleCreateBracketClick : undefined}
          onViewBracket={(id) => data.setSelectedBracketId(id)}
          onDeleteBracket={data.isAdmin ? onDeleteBracket : undefined}
          isLoading={data.isLoading}
          // Same test the wrapper's `hidden` class uses: while a bracket is
          // open the list is still mounted, and no season means the projected
          // seeds behind it stay unfetched.
          seasonId={showList ? data.selectedSeasonId : null}
        />
      </div>

      {/* Show BracketDetail when a bracket is selected */}
      {data.ready &&
        data.selectedBracketId &&
        data.bracket &&
        data.bracket.id === data.selectedBracketId && (
          <BracketDetail
            bracketId={data.selectedBracketId}
            bracket={data.bracket as unknown as PlayoffBracket}
            teams={data.teams}
            bracketLoading={data.isLoading}
            onEditMatch={undefined}
            onDeleteBracket={undefined}
          />
        )}
    </>
  );
};

export default PlayoffView;
