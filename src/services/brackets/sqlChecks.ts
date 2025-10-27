/**
 * SQL helper queries for debugging and managing bracket state
 */

/**
 * Get snapshot of Losers Bracket Round 1 matches
 * Shows which opponent slots are filled for debugging
 */
export const LB_R1_SNAPSHOT = (stageId: number): string => `
SELECT 
  m.id, 
  m.number, 
  m.opponent1_id, 
  m.opponent2_id, 
  m.status,
  m.round_id,
  r.number as round_number,
  g.number as group_number
FROM match m
JOIN round r ON r.id = m.round_id
JOIN "group" g ON g.id = r.group_id
WHERE g.stage_id = ${stageId} 
  AND g.number = 2 
  AND r.number = (
    SELECT MIN(r2.number) 
    FROM round r2 
    WHERE r2.group_id = g.id
  )
ORDER BY m.number;
`;

/**
 * Reset a Losers Bracket match to empty state
 * Useful for re-testing loser propagation
 */
export const RESET_LB_R1_MATCH = (lbMatchId: number): string => `
UPDATE match 
SET 
  opponent1_id = NULL, 
  opponent2_id = NULL, 
  opponent1_score = NULL,
  opponent2_score = NULL,
  opponent1_result = NULL,
  opponent2_result = NULL,
  status = 1
WHERE id = ${lbMatchId};
`;

/**
 * Get all matches for a stage with their current state
 * Useful for seeing the full bracket state
 */
export const STAGE_MATCHES_SNAPSHOT = (stageId: number): string => `
SELECT 
  m.id,
  m.number,
  g.number as group_number,
  CASE 
    WHEN g.number = 1 THEN 'Winners'
    WHEN g.number = 2 THEN 'Losers'
    WHEN g.number = 3 THEN 'Finals'
    ELSE 'Unknown'
  END as bracket_name,
  r.number as round_number,
  m.opponent1_id,
  m.opponent2_id,
  m.opponent1_score,
  m.opponent2_score,
  m.opponent1_result,
  m.opponent2_result,
  m.status,
  CASE
    WHEN m.status = 1 THEN 'Locked'
    WHEN m.status = 2 THEN 'Waiting'
    WHEN m.status = 3 THEN 'Ready'
    WHEN m.status = 4 THEN 'Running'
    WHEN m.status = 5 THEN 'Completed'
    WHEN m.status = 6 THEN 'Archived'
    ELSE 'Unknown'
  END as status_name
FROM match m
JOIN round r ON r.id = m.round_id
JOIN "group" g ON g.id = r.group_id
WHERE g.stage_id = ${stageId}
ORDER BY g.number, r.number, m.number;
`;

/**
 * Usage examples:
 * 
 * // In Supabase SQL Editor or via supabase client:
 * 
 * // 1. Check LB R1 state after QF updates
 * const { data } = await supabase.rpc('execute_sql', { 
 *   query: LB_R1_SNAPSHOT(32) 
 * });
 * 
 * // 2. Reset a specific LB match for re-testing
 * await supabase.rpc('execute_sql', { 
 *   query: RESET_LB_R1_MATCH(439) 
 * });
 * 
 * // 3. Get full bracket state
 * const { data } = await supabase.rpc('execute_sql', { 
 *   query: STAGE_MATCHES_SNAPSHOT(32) 
 * });
 */
