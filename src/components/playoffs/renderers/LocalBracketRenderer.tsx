
import React from "react";
import AdminView from "@/components/playoffs/views/AdminView";
import PlayoffView from "@/components/playoffs/views/PlayoffView";
import { PlayoffBracket, Team } from "@/types/playoffs";

interface LocalBracketRendererProps {
  bracket: PlayoffBracket;
  teams: Team[];
  // Accept and ignore any extra legacy props so TypeScript stops complaining
  [key: string]: any;
}

export const LocalBracketRenderer: React.FC<LocalBracketRendererProps> = ({
  bracket,
  teams,
  ...props
}) => {
  // Check if we have admin-specific data to determine which view to render
  const isAdmin = props.activeTab !== undefined;

  return (
    <>
      {/* Admin View with Tabs */}
      {bracket && isAdmin && (
        <AdminView />
      )}
      
      {/* Regular View */}
      {(!bracket || !isAdmin) && (
        <PlayoffView />
      )}
    </>
  );
};
