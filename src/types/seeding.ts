export type TeamSeedUpdateInput = {
  teamId: string;
  seed: number | null;
};

export type TeamSeedUpdateResult = {
  id: string;
  seed: number | null;
};

export type BulkTeamSeedUpdateResult = {
  success: boolean;
  team_id?: string;
  seed?: string | null;
  error?: string | null;
};

export type BulkTeamSeedUpdateRpcResponse = {
  results: BulkTeamSeedUpdateResult[];
};
