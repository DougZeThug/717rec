import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { StorageGroup, StorageRound } from '../../types/BracketServiceTypes';

export class LbStructureService {
  constructor(private storage: SupabaseSqlStorage) {}

  async findLbGroup(stageId: number): Promise<StorageGroup | null> {
    const groups = await this.storage.select('group', { stage_id: stageId });
    const groupsArray = (Array.isArray(groups) ? groups : [groups]) as StorageGroup[];
    return groupsArray.find((group) => group.number === 2) || null;
  }

  async findGfGroup(stageId: number): Promise<StorageGroup | null> {
    const groups = await this.storage.select('group', { stage_id: stageId });
    const groupsArray = (Array.isArray(groups) ? groups : [groups]) as StorageGroup[];
    return groupsArray.find((group) => group.number === 3) || null;
  }

  async findWbGroup(stageId: number): Promise<StorageGroup | null> {
    const groups = await this.storage.select('group', { stage_id: stageId });
    const groupsArray = (Array.isArray(groups) ? groups : [groups]) as StorageGroup[];
    return groupsArray.find((group) => group.number === 1) || null;
  }

  async findGroupRounds(groupId: number): Promise<StorageRound[]> {
    const rounds = await this.storage.select('round', { group_id: groupId });
    return (Array.isArray(rounds) ? rounds : [rounds]) as StorageRound[];
  }

  async findLbFirstRound(stageId: number): Promise<StorageRound | null> {
    const lbGroup = await this.findLbGroup(stageId);
    if (!lbGroup) return null;

    const lbRounds = await this.findGroupRounds(lbGroup.id);
    if (!lbRounds.length) return null;

    const minRoundNumber = Math.min(...lbRounds.map((round) => round.number));
    return lbRounds.find((round) => round.number === minRoundNumber) || null;
  }

  async findLbFinalRound(stageId: number): Promise<StorageRound | null> {
    const lbGroup = await this.findLbGroup(stageId);
    if (!lbGroup) return null;

    const lbRounds = await this.findGroupRounds(lbGroup.id);
    if (!lbRounds.length) return null;

    const maxRoundNumber = Math.max(...lbRounds.map((round) => round.number));
    return lbRounds.find((round) => round.number === maxRoundNumber) || null;
  }

  async findWbFinalRound(stageId: number): Promise<StorageRound | null> {
    const wbGroup = await this.findWbGroup(stageId);
    if (!wbGroup) return null;

    const wbRounds = await this.findGroupRounds(wbGroup.id);
    if (!wbRounds.length) return null;

    const maxRoundNumber = Math.max(...wbRounds.map((round) => round.number));
    return wbRounds.find((round) => round.number === maxRoundNumber) || null;
  }
}
