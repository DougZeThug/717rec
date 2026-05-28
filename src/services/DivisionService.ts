import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';

export type DisplayDivision = 'Competitive' | 'Intermediate' | 'Recreational';

export interface DivisionInput {
  name: string;
  display_division: DisplayDivision;
  division_weight: number;
}

export const DivisionService = {
  fetchDivisions: async () => {
    const { data, error } = await supabase
      .from('divisions')
      .select('id, name, division_weight, display_division, created_at')
      .order('division_weight', { ascending: false });

    if (error) handleDatabaseError(error, 'Failed to fetch divisions');
    return data ?? [];
  },

  /**
   * Fetch division weights as a Map<divisionId, weight>.
   * Used by the division weights cache.
   */
  fetchDivisionWeightsMap: async (): Promise<
    { id: string; division_weight: number | null; name: string }[]
  > => {
    const { data, error } = await supabase
      .from('divisions')
      .select('id, name, division_weight')
      .order('name');

    if (error) handleDatabaseError(error, 'Failed to fetch division weights');
    return data ?? [];
  },

  createDivision: async (input: DivisionInput) => {
    const { data, error } = await supabase
      .from('divisions')
      .insert({
        name: input.name.trim(),
        display_division: input.display_division,
        division_weight: input.division_weight,
      })
      .select('id, name, division_weight, display_division, created_at')
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to create division');
    return data;
  },

  updateDivision: async (
    id: string,
    patch: Partial<DivisionInput>
  ) => {
    const payload: {
      name?: string;
      display_division?: string;
      division_weight?: number;
    } = {};
    if (patch.name !== undefined) payload.name = patch.name.trim();
    if (patch.display_division !== undefined) payload.display_division = patch.display_division;
    if (patch.division_weight !== undefined) payload.division_weight = patch.division_weight;

    const { data, error } = await supabase
      .from('divisions')
      .update(payload)
      .eq('id', id)
      .select('id, name, division_weight, display_division, created_at')
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to update division');
    return data;
  },

  deleteDivision: async (id: string) => {
    // Block deletion if any teams reference this division.
    const { count, error: countError } = await supabase
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .eq('division_id', id);

    if (countError) handleDatabaseError(countError, 'Failed to check division usage');
    if ((count ?? 0) > 0) {
      throw new BusinessLogicError(
        `Division is in use by ${count} team${count === 1 ? '' : 's'} and cannot be deleted.`
      );
    }

    const { error } = await supabase.from('divisions').delete().eq('id', id);
    if (error) handleDatabaseError(error, 'Failed to delete division');
  },
};
