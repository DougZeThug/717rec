
import React from "react";
import { ViewType } from '../hooks/useViewSelection';
import { PlayoffLoadingView } from './PlayoffLoadingView';
import AdminView from '@/components/playoffs/views/AdminView';
import PlayoffView from '@/components/playoffs/views/PlayoffView';
import { PlayoffPageData } from '../hooks/usePlayoffPageData';

interface Props {
  view: ViewType;
  bracketDialogOpen: boolean;
  setBracketDialogOpen: (open: boolean) => void;
  onCreateBracket: () => void;
  onDeleteBracket: (bracketId: string, bracketName: string) => void;
  data: PlayoffPageData;
}

export const PlayoffViewSelector: React.FC<Props> = ({ 
  view, 
  bracketDialogOpen, 
  setBracketDialogOpen, 
  onCreateBracket,
  onDeleteBracket,
  data 
}) => {
  switch (view) {
    case 'loading':
      return <PlayoffLoadingView />;
    case 'admin':
      return (
        <AdminView 
          bracketDialogOpen={bracketDialogOpen}
          setBracketDialogOpen={setBracketDialogOpen}
          onCreateBracket={onCreateBracket}
          onDeleteBracket={onDeleteBracket}
          data={data}
        />
      );
    case 'public':
      return (
        <PlayoffView 
          bracketDialogOpen={bracketDialogOpen}
          setBracketDialogOpen={setBracketDialogOpen}
          onCreateBracket={onCreateBracket}
          onDeleteBracket={onDeleteBracket}
          data={data}
        />
      );
    default:
      // Fallback to public view to ensure Challonge brackets are always shown
      return (
        <PlayoffView 
          bracketDialogOpen={bracketDialogOpen}
          setBracketDialogOpen={setBracketDialogOpen}
          onCreateBracket={onCreateBracket}
          onDeleteBracket={onDeleteBracket}
          data={data}
        />
      );
  }
};
