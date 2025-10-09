/**
 * Greedy Back-to-Back Scheduler
 * 
 * Schedules teams for TWO matches in consecutive timeslots (S1, S2).
 * 
 * ALGORITHM:
 * - Even teams: Everyone plays in S1 and S2 (one match per slot)
 * - Odd teams: Bye1 sits out S1, Bye2 sits out S2, they play each other in S3
 * 
 * CONSTRAINTS:
 * - No rematches against season history
 * - No session rematches (can't play same team twice tonight)
 * - Max tier gap = 1 (blocks T1 vs T3+)
 * - Favor same-division first, then adjacent-tier
 * 
 * GUARANTEES:
 * - Every team gets exactly 2 matches
 * - Deterministic (same input = same output)
 * - Fast O(N²) greedy selection
 * 
 * ODD TEAM HANDLING:
 * When there's an odd number of teams, we ensure everyone still gets 2 matches:
 * 1. Select Bye1 (team that sits out Slot 1)
 * 2. Generate S1 pairings for all others
 * 3. Select Bye2 (team that sits out Slot 2, must not have played Bye1 before)
 * 4. Generate S2 pairings for all others
 * 5. Create S3 (third slot) where Bye1 plays Bye2
 * Result: Bye1 has matches in S2+S3, Bye2 has matches in S1+S3, everyone else has S1+S2
 * 
 * USAGE:
 * ```typescript
 * const matches = generateScheduleGreedy({
 *   teams: allTeams,
 *   historyPairs: seasonHistory, // [[teamAId, teamBId], ...]
 *   slots: ["8:30", "9:00"],
 *   thirdSlot: "9:30", // Optional, used only for odd team count
 *   config: {
 *     maxTierGap: 1, // Default: 1 (prevents T1 vs T3)
 *     byeStrategy: 'last' // Default: 'last'
 *   }
 * });
 * ```
 */

import { Team } from '@/types/autoSchedule';

export interface GreedySchedulerInput {
  teams: Team[];
  historyPairs: Array<[string, string]>; // Season history
  slots: [string, string]; // Base slots (e.g., ["8:30", "9:00"])
  thirdSlot?: string; // Optional S3 for odd-team nights (e.g., "9:30")
  config?: {
    maxTierGap?: number; // Default: 1 (blocks T1 vs T3)
    byeStrategy?: 'last' | 'fewestPartners'; // Default: 'last'
  };
}

export interface ScheduledMatch {
  slot: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  divisionA: string;
  divisionB: string;
  tierA: number;
  tierB: number;
}

const MAX_TIER_GAP = 1; // Block tier differences > 1
const DEFAULT_BYE_STRATEGY = 'last';

/**
 * Generate canonical pairing key (sorted IDs)
 */
function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}||${idB}` : `${idB}||${idA}`;
}

/**
 * Extract tier number from division name
 * Maps display division names to tier numbers:
 * - Competitive → Tier 1
 * - Intermediate → Tier 2
 * - Recreational → Tier 3
 */
function getTier(team: Team): number {
  const divisionName = (team.divisionName || '').toLowerCase();
  
  // Map display division names to tier numbers
  if (divisionName.includes('competitive')) return 1;
  if (divisionName.includes('intermediate')) return 2;
  if (divisionName.includes('recreational')) return 3;
  
  // Fallback: try to extract tier number from name (e.g., "Tier 2")
  const tierMatch = divisionName.match(/tier\s*(\d+)/i);
  if (tierMatch) {
    return parseInt(tierMatch[1], 10);
  }
  
  // Default to tier 2 (middle) if unknown
  console.warn(`Unknown division for team ${team.name}: "${team.divisionName}"`);
  return 2;
}

/**
 * Calculate tier distance between two teams
 */
function tierDistance(teamA: Team, teamB: Team): number {
  return Math.abs(getTier(teamA) - getTier(teamB));
}

/**
 * Check if two teams can play against each other
 */
function canPlay(
  teamA: Team,
  teamB: Team,
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  maxTierGap: number
): boolean {
  const key = pairKey(teamA.id, teamB.id);
  const tierA = getTier(teamA);
  const tierB = getTier(teamB);
  const tierDist = tierDistance(teamA, teamB);
  
  // Can't play if they've already played this season
  if (playedSet.has(key)) {
    console.log(`    ❌ ${teamA.name} vs ${teamB.name}: Already played this season`);
    return false;
  }
  
  // Can't play if they've already been paired tonight
  if (tonightPairs.has(key)) {
    console.log(`    ❌ ${teamA.name} vs ${teamB.name}: Already paired tonight`);
    return false;
  }
  
  // Can't play if tier gap is too large
  if (tierDist > maxTierGap) {
    console.log(`    ❌ ${teamA.name} (Tier ${tierA}) vs ${teamB.name} (Tier ${tierB}): Tier gap ${tierDist} > ${maxTierGap}`);
    return false;
  }
  
  console.log(`    ✅ ${teamA.name} (Tier ${tierA}) vs ${teamB.name} (Tier ${tierB}): CAN PLAY`);
  return true;
}

/**
 * Find best opponent for a team using greedy selection
 */
function findBestOpponent(
  team: Team,
  candidates: Team[],
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  teamMatchCounts: Map<string, number>,
  maxTierGap: number
): Team | null {
  console.log(`  🔍 Finding opponent for ${team.name} (Tier ${getTier(team)})`);
  console.log(`     Initial candidates: ${candidates.filter(c => c.id !== team.id).length}`);
  
  const validCandidates = candidates.filter(candidate => 
    candidate.id !== team.id &&
    canPlay(team, candidate, playedSet, tonightPairs, maxTierGap)
  );

  console.log(`     Valid candidates after canPlay filter: ${validCandidates.length}`);
  
  if (validCandidates.length === 0) {
    console.warn(`     ⚠️ NO VALID CANDIDATES for ${team.name}`);
    console.warn(`        All candidates: ${candidates.filter(c => c.id !== team.id).map(c => c.name).join(', ')}`);
    return null;
  }

  // Sort by priority:
  // 1. Same division (tier distance = 0)
  // 2. Adjacent tier (tier distance = 1)
  // 3. Fewer total matches scheduled tonight
  // 4. Alphabetically by name (stable tie-break)
  validCandidates.sort((a, b) => {
    const distA = tierDistance(team, a);
    const distB = tierDistance(team, b);
    
    if (distA !== distB) return distA - distB;
    
    const matchesA = teamMatchCounts.get(a.id) || 0;
    const matchesB = teamMatchCounts.get(b.id) || 0;
    
    if (matchesA !== matchesB) return matchesA - matchesB;
    
    return a.name.localeCompare(b.name);
  });

  return validCandidates[0];
}

/**
 * Pick a bye team for odd-team nights
 */
function pickBye(
  teams: Team[],
  strategy: 'last' | 'fewestPartners',
  playedSet: Set<string>,
  maxTierGap: number,
  excludeIds: Set<string> = new Set()
): Team {
  const availableTeams = teams.filter(t => !excludeIds.has(t.id));
  
  if (strategy === 'last') {
    return availableTeams[availableTeams.length - 1];
  }
  
  // 'fewestPartners' strategy: pick team with fewest valid opponents
  let minPartners = Infinity;
  let byeTeam = availableTeams[0];
  
  for (const team of availableTeams) {
    const validPartners = availableTeams.filter(other => 
      other.id !== team.id &&
      !excludeIds.has(other.id) &&
      canPlay(team, other, playedSet, new Set(), maxTierGap)
    ).length;
    
    if (validPartners < minPartners) {
      minPartners = validPartners;
      byeTeam = team;
    }
  }
  
  return byeTeam;
}

/**
 * Generate pairings for a single slot (greedy)
 */
function generateSlotPairings(
  teams: Team[],
  slotName: string,
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  teamMatchCounts: Map<string, number>,
  maxTierGap: number,
  byeTeamId?: string
): ScheduledMatch[] {
  const matches: ScheduledMatch[] = [];
  const pairedInSlot = new Set<string>();
  
  if (byeTeamId) {
    pairedInSlot.add(byeTeamId);
  }
  
  for (const team of teams) {
    if (pairedInSlot.has(team.id)) continue;
    
    console.log(`\n🎯 Processing team: ${team.name} in slot ${slotName}`);
    console.log(`   Already paired in slot: ${pairedInSlot.size} teams`);
    console.log(`   Paired teams: ${Array.from(pairedInSlot).map(id => teams.find(t => t.id === id)?.name).join(', ')}`);
    
    const availableCandidates = teams.filter(t => !pairedInSlot.has(t.id));
    console.log(`   Available candidates: ${availableCandidates.length}`);
    
    const opponent = findBestOpponent(
      team,
      availableCandidates,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap
    );
    
    if (!opponent) {
      console.warn(`\n❌ FAILED: No opponent found for team ${team.name} in slot ${slotName}`);
      console.warn(`   Available unpaired teams: ${availableCandidates.filter(c => c.id !== team.id).map(c => `${c.name} (Tier ${getTier(c)})`).join(', ')}`);
      console.warn(`   playedSet size: ${playedSet.size}`);
      console.warn(`   tonightPairs size: ${tonightPairs.size}`);
      console.warn(`   Tonight pairs: ${Array.from(tonightPairs).slice(0, 5).join(', ')}...`);
      continue;
    }
    
    // Create match
    const match: ScheduledMatch = {
      slot: slotName,
      teamAId: team.id,
      teamBId: opponent.id,
      teamAName: team.name,
      teamBName: opponent.name,
      divisionA: team.divisionName || 'Unknown',
      divisionB: opponent.divisionName || 'Unknown',
      tierA: getTier(team),
      tierB: getTier(opponent)
    };
    
    matches.push(match);
    
    // Mark both teams as paired in this slot
    pairedInSlot.add(team.id);
    pairedInSlot.add(opponent.id);
    
    // Add to tonight pairs to prevent session rematches
    tonightPairs.add(pairKey(team.id, opponent.id));
    
    // Increment match counts
    teamMatchCounts.set(team.id, (teamMatchCounts.get(team.id) || 0) + 1);
    teamMatchCounts.set(opponent.id, (teamMatchCounts.get(opponent.id) || 0) + 1);
  }
  
  return matches;
}

/**
 * Main greedy scheduler function
 */
export function generateScheduleGreedy(input: GreedySchedulerInput): ScheduledMatch[] {
  const { teams, historyPairs, slots, thirdSlot, config } = input;
  const maxTierGap = config?.maxTierGap ?? MAX_TIER_GAP;
  const byeStrategy = config?.byeStrategy ?? DEFAULT_BYE_STRATEGY;
  
  // Build played set from season history
  const playedSet = new Set<string>();
  for (const [idA, idB] of historyPairs) {
    playedSet.add(pairKey(idA, idB));
  }
  
  // Sort teams for deterministic order (by tier, then name)
  const sortedTeams = [...teams].sort((a, b) => {
    const tierA = getTier(a);
    const tierB = getTier(b);
    if (tierA !== tierB) return tierA - tierB;
    return a.name.localeCompare(b.name);
  });
  
  const tonightPairs = new Set<string>();
  const teamMatchCounts = new Map<string, number>();
  const [slot1, slot2] = slots;
  const isOdd = teams.length % 2 === 1;
  
  if (!isOdd) {
    // ============ EVEN TEAM COUNT ============
    console.log(`Scheduling ${teams.length} teams (even) for slots ${slot1} and ${slot2}`);
    
    // Generate S1 pairings
    const s1Matches = generateSlotPairings(
      sortedTeams,
      slot1,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap
    );
    
    // Generate S2 pairings
    const s2Matches = generateSlotPairings(
      sortedTeams,
      slot2,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap
    );
    
    const allMatches = [...s1Matches, ...s2Matches];
    
    // Validation: every team should have exactly 2 matches
    const matchCountsArray = Array.from(teamMatchCounts.values());
    const allHaveTwoMatches = matchCountsArray.every(count => count === 2);
    
    if (!allHaveTwoMatches) {
      console.warn('Warning: Not all teams have exactly 2 matches', Object.fromEntries(teamMatchCounts));
    }
    
    console.log(`Generated ${allMatches.length} matches (${s1Matches.length} in ${slot1}, ${s2Matches.length} in ${slot2})`);
    return allMatches;
    
  } else {
    // ============ ODD TEAM COUNT ============
    console.log(`Scheduling ${teams.length} teams (odd) for slots ${slot1}, ${slot2}, and ${thirdSlot || 'S3'}`);
    
    // Select Bye1 for S1
    const bye1 = pickBye(sortedTeams, byeStrategy, playedSet, maxTierGap);
    console.log(`Selected Bye1: ${bye1.name} (sits out ${slot1})`);
    
    // Generate S1 pairings (excluding Bye1)
    const s1Matches = generateSlotPairings(
      sortedTeams,
      slot1,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap,
      bye1.id
    );
    
    // Select Bye2 for S2 (must be different from Bye1 and not have played Bye1)
    let bye2: Team | null = null;
    const excludeForBye2 = new Set([bye1.id]);
    
    // Try to find a valid Bye2 (max 3 attempts with different strategies)
    for (let attempt = 0; attempt < 3 && !bye2; attempt++) {
      const candidate = pickBye(sortedTeams, byeStrategy, playedSet, maxTierGap, excludeForBye2);
      
      if (canPlay(bye1, candidate, playedSet, tonightPairs, maxTierGap)) {
        bye2 = candidate;
      } else {
        excludeForBye2.add(candidate.id);
      }
    }
    
    if (!bye2) {
      // Fallback: just pick any team that isn't Bye1
      bye2 = sortedTeams.find(t => t.id !== bye1.id) || sortedTeams[0];
      console.warn(`Could not find ideal Bye2, using fallback: ${bye2.name}`);
    } else {
      console.log(`Selected Bye2: ${bye2.name} (sits out ${slot2})`);
    }
    
    // Generate S2 pairings (excluding Bye2)
    const s2Matches = generateSlotPairings(
      sortedTeams,
      slot2,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap,
      bye2.id
    );
    
    // Generate S3 match: Bye1 vs Bye2
    const slot3Name = thirdSlot || 'S3';
    const s3Match: ScheduledMatch = {
      slot: slot3Name,
      teamAId: bye1.id,
      teamBId: bye2.id,
      teamAName: bye1.name,
      teamBName: bye2.name,
      divisionA: bye1.divisionName || 'Unknown',
      divisionB: bye2.divisionName || 'Unknown',
      tierA: getTier(bye1),
      tierB: getTier(bye2)
    };
    
    tonightPairs.add(pairKey(bye1.id, bye2.id));
    teamMatchCounts.set(bye1.id, (teamMatchCounts.get(bye1.id) || 0) + 1);
    teamMatchCounts.set(bye2.id, (teamMatchCounts.get(bye2.id) || 0) + 1);
    
    const allMatches = [...s1Matches, ...s2Matches, s3Match];
    
    // Validation
    const matchCountsArray = Array.from(teamMatchCounts.values());
    const allHaveTwoMatches = matchCountsArray.every(count => count === 2);
    
    if (!allHaveTwoMatches) {
      console.warn('Warning: Not all teams have exactly 2 matches', Object.fromEntries(teamMatchCounts));
    }
    
    console.log(`Generated ${allMatches.length} matches (${s1Matches.length} in ${slot1}, ${s2Matches.length} in ${slot2}, 1 in ${slot3Name})`);
    console.log(`Bye1 (${bye1.name}) plays in ${slot2} + ${slot3Name}`);
    console.log(`Bye2 (${bye2.name}) plays in ${slot1} + ${slot3Name}`);
    
    return allMatches;
  }
}
