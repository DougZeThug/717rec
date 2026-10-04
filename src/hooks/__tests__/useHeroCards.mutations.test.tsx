import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockToast, mockService } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockService: {
    createHeroCard: vi.fn(),
    updateHeroCard: vi.fn(),
    deleteHeroCard: vi.fn(),
    toggleHeroCardVisibility: vi.fn(),
    fetchVisibleHeroCards: vi.fn(),
    fetchAllHeroCards: vi.fn(),
  },
}));

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/services/HeroCardService', () => ({ HeroCardService: mockService }));

import { useHeroCardMutations } from '../useHeroCards';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { mutations: { retry: false } } }) },
    children
  );

const run = async (fn: () => Promise<unknown>) => {
  await act(async () => {
    await fn().catch(() => undefined);
  });
};

describe('useHeroCardMutations toasts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockService).forEach((fn) => fn.mockResolvedValue(undefined));
  });

  it.each([
    ['createCard', 'createHeroCard', 'Hero card created', {}],
    ['updateCard', 'updateHeroCard', 'Hero card updated', { id: 'h1' }],
    ['deleteCard', 'deleteHeroCard', 'Hero card deleted', 'h1'],
    [
      'toggleVisibility',
      'toggleHeroCardVisibility',
      'Visibility updated',
      { id: 'h1', is_visible: true },
    ],
  ] as const)('%s says so with a success toast', async (action, service, title, arg) => {
    const { result } = renderHook(() => useHeroCardMutations(), { wrapper });

    await run(() => (result.current[action] as (a: unknown) => Promise<unknown>)(arg));

    expect(mockService[service]).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title, variant: 'success' }));
  });

  it.each([
    ['createCard', 'createHeroCard', {}],
    ['updateCard', 'updateHeroCard', { id: 'h1' }],
    ['deleteCard', 'deleteHeroCard', 'h1'],
    ['toggleVisibility', 'toggleHeroCardVisibility', { id: 'h1', is_visible: true }],
  ] as const)('%s shows an error toast when it fails', async (action, service, arg) => {
    mockService[service].mockRejectedValue(new Error('db down'));
    const { result } = renderHook(() => useHeroCardMutations(), { wrapper });

    await run(() => (result.current[action] as (a: unknown) => Promise<unknown>)(arg));

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
