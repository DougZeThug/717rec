import { defineTool } from '@lovable.dev/mcp-js';
import { z } from 'zod';

import { anonClient, errorResult, getActiveSeasonId, textResult } from './_supabase';

const STATUS_LABELS: Record<number, string> = {
  0: 'locked',
  1: 'waiting',
  2: 'ready',
  3: 'running',
  4: 'completed',
  5: 'archived',
};

export default defineTool({
  name: 'get_bracket',
  title: 'Get playoff bracket',
  description:
    'Get the live playoff bracket(s) for the active 717rec season: stages, rounds, matches, participants, scores and match status. Public data, no login required.',
  inputSchema: {
    bracketId: z.string().optional().describe('Optional specific bracket (tournament) id.'),
    division: z.string().optional().describe('Optional bracket title filter (case-insensitive).'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bracketId, division }) => {
    const supabase = anonClient();
    const seasonId = await getActiveSeasonId(supabase);
    if (!seasonId) return textResult([]);

    let bracketQuery = supabase
      .from('brackets')
      .select('id, title, format, state, season_id, created_at')
      .eq('season_id', seasonId);
    if (bracketId) bracketQuery = bracketQuery.eq('id', bracketId);
    if (division) bracketQuery = bracketQuery.ilike('title', `%${division}%`);

    const { data: brackets, error: bracketErr } = await bracketQuery;
    if (bracketErr) return errorResult(bracketErr.message);
    if (!brackets?.length) return textResult([]);

    const ids = brackets.map((b) => b.id);

    const [stages, participants] = await Promise.all([
      supabase
        .from('stage')
        .select('id, name, number, type, tournament_id')
        .in('tournament_id', ids),
      supabase
        .from('participant')
        .select('id, name, team_id, position, tournament_id')
        .in('tournament_id', ids),
    ]);

    if (stages.error) return errorResult(stages.error.message);
    if (participants.error) return errorResult(participants.error.message);

    const stageIds = (stages.data ?? []).map((s) => s.id);

    const emptyResult = <T>(): { data: T[]; error: null } => ({ data: [], error: null });

    const [roundRows, matchRows] = await Promise.all([
      stageIds.length > 0
        ? supabase
            .from('round')
            .select('id, name, number, stage_id, group_id')
            .in('stage_id', stageIds)
        : Promise.resolve(
            emptyResult<{
              id: number;
              name: string | null;
              number: number;
              stage_id: number;
              group_id: number;
            }>()
          ),
      stageIds.length > 0
        ? supabase
            .from('match')
            .select(
              'id, number, stage_id, group_id, round_id, status, opponent1_id, opponent1_score, opponent1_result, opponent2_id, opponent2_score, opponent2_result'
            )
            .in('stage_id', stageIds)
        : Promise.resolve(
            emptyResult<{
              id: number;
              number: number;
              stage_id: number;
              group_id: number;
              round_id: number;
              status: number;
              opponent1_id: number | null;
              opponent1_score: number | null;
              opponent1_result: string | null;
              opponent2_id: number | null;
              opponent2_score: number | null;
              opponent2_result: string | null;
            }>()
          ),
    ]);
    if (roundRows.error) return errorResult(roundRows.error.message);
    if (matchRows.error) return errorResult(matchRows.error.message);

    const participantName = new Map<number, string | null>(
      (participants.data ?? []).map((p) => [p.id, p.name ?? null])
    );

    const payload = brackets.map((bracket) => {
      const bracketStages = (stages.data ?? []).filter((s) => s.tournament_id === bracket.id);
      const bracketStageIds = new Set(bracketStages.map((s) => s.id));
      return {
        bracket_id: bracket.id,
        title: bracket.title,
        format: bracket.format,
        state: bracket.state,
        participants: (participants.data ?? [])
          .filter((p) => p.tournament_id === bracket.id)
          .map((p) => ({ id: p.id, name: p.name, team_id: p.team_id, seed: p.position })),
        stages: bracketStages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          type: stage.type,
          number: stage.number,
          rounds: (roundRows.data ?? [])
            .filter((r) => r.stage_id === stage.id)
            .sort((a, b) => a.number - b.number)
            .map((round) => ({
              id: round.id,
              name: round.name,
              number: round.number,
              matches: (matchRows.data ?? [])
                .filter((m) => m.round_id === round.id && bracketStageIds.has(m.stage_id))
                .sort((a, b) => a.number - b.number)
                .map((m) => ({
                  id: m.id,
                  number: m.number,
                  status: STATUS_LABELS[m.status] ?? m.status,
                  opponent1: {
                    name:
                      m.opponent1_id != null ? (participantName.get(m.opponent1_id) ?? null) : null,
                    score: m.opponent1_score,
                    result: m.opponent1_result,
                  },
                  opponent2: {
                    name:
                      m.opponent2_id != null ? (participantName.get(m.opponent2_id) ?? null) : null,
                    score: m.opponent2_score,
                    result: m.opponent2_result,
                  },
                })),
            })),
        })),
      };
    });

    return textResult(payload);
  },
});
