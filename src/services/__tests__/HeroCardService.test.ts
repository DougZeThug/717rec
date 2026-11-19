import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, DatabaseError } from '@/types/errors';

const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

import { HeroCardService } from '../HeroCardService';

const pgError = { message: 'failed', code: '42P01', details: null, hint: null };

afterEach(() => vi.resetAllMocks());

describe('HeroCardService.toggleHeroCardVisibility', () => {
  it('updates the visibility of the chosen card', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'card-1' }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });

    await HeroCardService.toggleHeroCardVisibility({ id: 'card-1', is_visible: false });

    expect(mockFrom).toHaveBeenCalledWith('hero_cards');
    expect(update).toHaveBeenCalledWith({
      is_visible: false,
      updated_at: expect.any(String),
    });
    expect(eq).toHaveBeenCalledWith('id', 'card-1');
    expect(select).toHaveBeenCalledWith('id');
  });

  it('throws DatabaseError when the database fails', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: pgError }),
          }),
        }),
      }),
    });

    await expect(
      HeroCardService.toggleHeroCardVisibility({ id: 'card-1', is_visible: true })
    ).rejects.toThrow(DatabaseError);
  });

  it('throws BusinessLogicError when no row was updated', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
      }),
    });

    const attempt = HeroCardService.toggleHeroCardVisibility({ id: 'gone', is_visible: true });
    await expect(attempt).rejects.toThrow(BusinessLogicError);
    await expect(
      HeroCardService.toggleHeroCardVisibility({ id: 'gone', is_visible: true })
    ).rejects.toThrow(/Nothing was saved. This hero card/);
  });
});
