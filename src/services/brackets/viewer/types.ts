// Type definitions for brackets-viewer.js v1.8.1

export interface ViewerStage {
  id: number;
  tournament_id: number;
  name: string;
  type: 'single_elimination' | 'double_elimination' | 'round_robin';
  number: number;
  settings: {
    seedOrdering?: string[];
    size?: number;
    grandFinal?: 'simple' | 'double';
  };
}

export interface ViewerMatch {
  id: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  number: number;
  child_count?: number;  // Added: Required for connectors
  opponent1: {
    id: number | null;
    position?: number;
    result?: 'win' | 'loss';
    score?: number;
    source_node_id?: string;
    source_type?: 'winner' | 'loser';
  } | null;
  opponent2: {
    id: number | null;
    position?: number;
    result?: 'win' | 'loss';
    score?: number;
    source_node_id?: string;
    source_type?: 'winner' | 'loser';
  } | null;
  status: 'locked' | 'waiting' | 'ready' | 'running' | 'completed' | 'archived';
}

export interface ViewerMatchGame {
  id: number;
  number: number;
  stage_id: number;
  parent_id: number; // match_id
  status: 'locked' | 'waiting' | 'ready' | 'running' | 'completed';
  opponent1: {
    id?: number;
    score?: number;
    result?: 'win' | 'loss';
  };
  opponent2: {
    id?: number;
    score?: number;
    result?: 'win' | 'loss';
  };
}

export interface ViewerParticipant {
  id: number;
  tournament_id: number;
  name: string;
  image?: string;
  position?: number;
}

export interface ViewerData {
  stages: ViewerStage[];
  groups?: any[];
  rounds?: any[];
  matches: ViewerMatch[];
  matchGames: ViewerMatchGame[];
  participants: ViewerParticipant[];
}

export interface ViewerDataWithMapping {
  data: ViewerData;
  getPlayoffMatchId: (viewerMatchId: number) => string | undefined;
}
