
import React from "react";
import { ViewType } from '../hooks/useViewSelection';
import { PlayoffLoadingView } from './PlayoffLoadingView';
import AdminView from '@/components/playoffs/views/AdminView';
import PlayoffView from '@/components/playoffs/views/PlayoffView';

interface Props {
  view: ViewType;
}

export const PlayoffViewSelector: React.FC<Props> = ({ view }) => {
  switch (view) {
    case 'loading':
      return <PlayoffLoadingView />;
    case 'admin':
      return <AdminView />;
    case 'public':
      return <PlayoffView />;
    default:
      // Fallback to public view to ensure Challonge brackets are always shown
      return <PlayoffView />;
  }
};
