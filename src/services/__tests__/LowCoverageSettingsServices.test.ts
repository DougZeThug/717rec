import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, DatabaseError } from '@/types/errors';

const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

import { ThemeSettingsService } from '../ThemeSettingsService';
import { TrafficService } from '../traffic/TrafficService';

const pgError = { message: 'failed', code: '42P01', details: null, hint: null };

afterEach(() => vi.resetAllMocks());

describe('TrafficService', () => {
  it('returns ordered rows and empty data', async () => {
    const order = vi.fn().mockResolvedValueOnce({ data: [{ day: '2026-01-01' }], error: null });
    const gte = vi.fn(() => ({ order }));
    mockFrom.mockReturnValue({ select: () => ({ gte }) });
    expect(await TrafficService.fetchDailyTraffic(7)).toEqual([{ day: '2026-01-01' }]);
    expect(mockFrom).toHaveBeenCalledWith('v_daily_traffic');
    expect(order).toHaveBeenCalledWith('day', { ascending: true });

    order.mockResolvedValueOnce({ data: null, error: null });
    expect(await TrafficService.fetchDailyTraffic()).toEqual([]);
  });

  it('throws DatabaseError for query failures', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        gte: () => ({ order: () => Promise.resolve({ data: null, error: pgError }) }),
      }),
    });
    await expect(TrafficService.fetchDailyTraffic()).rejects.toThrow(DatabaseError);
  });
});

describe('ThemeSettingsService', () => {
  it('returns settings and empty data', async () => {
    const order = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ theme_key: 'winter' }], error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    mockFrom.mockReturnValue({ select: () => ({ order }) });
    expect(await ThemeSettingsService.fetchAll()).toEqual([{ theme_key: 'winter' }]);
    expect(await ThemeSettingsService.fetchAll()).toEqual([]);
  });

  it('updates the selected key', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'theme-1' }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });
    await ThemeSettingsService.updateEnabled('winter', true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ is_enabled: true, updated_at: expect.any(String) })
    );
    expect(eq).toHaveBeenCalledWith('theme_key', 'winter');
    expect(select).toHaveBeenCalledWith('id');
  });

  it('throws DatabaseError for reads and writes', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: () => ({ order: () => Promise.resolve({ data: null, error: pgError }) }),
      })
      .mockReturnValueOnce({
        update: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: pgError }),
            }),
          }),
        }),
      });
    await expect(ThemeSettingsService.fetchAll()).rejects.toThrow(DatabaseError);
    await expect(ThemeSettingsService.updateEnabled('winter', false)).rejects.toThrow(
      DatabaseError
    );
  });

  it('throws BusinessLogicError when no row was updated', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
      }),
    });
    await expect(ThemeSettingsService.updateEnabled('winter', false)).rejects.toThrow(
      BusinessLogicError
    );
    await expect(ThemeSettingsService.updateEnabled('winter', false)).rejects.toThrow(
      /Nothing was saved/
    );
  });
});
