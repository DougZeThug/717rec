
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
      return (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No bracket selected</p>
        </div>
      );
  }
};
