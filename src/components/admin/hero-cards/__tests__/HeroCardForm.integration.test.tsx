import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';

import { HeroCard } from '@/types/heroCard';

import HeroCardForm from '../HeroCardForm';

const mocks = vi.hoisted(() => ({
  createCard: vi.fn().mockResolvedValue(null),
  updateCard: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/hooks/useHeroCards', () => ({
  useHeroCardMutations: () => ({ ...mocks, isCreating: false, isUpdating: false }),
}));
vi.mock('../TargetSelector', () => ({
  TargetTypeSelector: () => <div />, TargetEntitySelector: () => <div />,
}));
vi.mock('@/components/hero/HeroCard', () => ({ default: () => <div data-testid="preview" /> }));

class ResizeObserverMock {
  observe(_target: Element): void {
    void _target;
  }
  unobserve(_target: Element): void {
    void _target;
  }
  disconnect(): void {
    // no-op for tests
  }
}

const renderForm = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeAll(() => {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
});

const makeCard = (overrides: Partial<HeroCard> = {}): HeroCard => ({
  id: 'c1',
  slug: 'old',
  title: 'Old',
  subtitle: null,
  body: null,
  cta_label: null,
  cta_url: null,
  background_color: 'bg-gradient-to-r from-blue-600 to-amber-500',
  text_color: 'text-white',
  accent_color: null,
  image_url: null,
  icon_name: null,
  is_visible: true,
  sort_order: 1,
  target_type: 'none',
  target_id: null,
  card_type: 'standard',
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('HeroCardForm integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('supports create mode and blocks submit when required fields are empty', async () => {
    const onClose = vi.fn();
    renderForm(<HeroCardForm card={null} onClose={onClose} />);
    expect(screen.getByRole('heading', { name: 'Create Hero Card' })).toBeInTheDocument();

    const save = screen.getByRole('button', { name: 'Create Card' });
    const form = save.closest('form');
    expect(form).not.toBeNull();
    expect(form?.checkValidity()).toBe(false);
    await userEvent.click(save);
    expect(mocks.createCard).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('submits create payload when valid', async () => {
    const onClose = vi.fn();
    renderForm(<HeroCardForm card={null} onClose={onClose} />);

    await userEvent.type(screen.getByLabelText('Card Name (for admins)'), 'spring-launch');
    await userEvent.type(screen.getByLabelText('Headline'), 'Spring Launch');
    await userEvent.click(screen.getByRole('button', { name: 'Create Card' }));

    expect(mocks.createCard).toHaveBeenCalledTimes(1);
    expect(mocks.createCard.mock.calls[0][0]).toMatchObject({ slug: 'spring-launch', title: 'Spring Launch' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports edit mode and calls update', async () => {
    const onClose = vi.fn();
    renderForm(<HeroCardForm card={makeCard()} onClose={onClose} />);
    expect(screen.getByRole('heading', { name: 'Edit Hero Card' })).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Headline'));
    await userEvent.type(screen.getByLabelText('Headline'), 'Updated');
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mocks.updateCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', title: 'Updated' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
