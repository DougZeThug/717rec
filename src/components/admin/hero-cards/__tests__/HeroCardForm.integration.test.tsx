import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { HeroCard } from '@/types/heroCard';
import { clearUnsavedWork, findUnsavedWork } from '@/utils/unsavedChanges';

import HeroCardForm from '../HeroCardForm';

const mocks = vi.hoisted(() => ({
  createCard: vi.fn().mockResolvedValue(null),
  updateCard: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/hooks/useHeroCards', () => ({
  useHeroCardMutations: () => ({ ...mocks, isCreating: false, isUpdating: false }),
}));
vi.mock('../TargetSelector', () => ({
  TargetTypeSelector: () => <div />,
  TargetEntitySelector: () => <div />,
}));
vi.mock('@/components/hero/HeroCard', () => ({ default: () => <div data-testid="preview" /> }));

const renderForm = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeAll(() => {
  function ResizeObserverCtor(this: {
    observe: () => undefined;
    unobserve: () => undefined;
    disconnect: () => undefined;
  }) {
    this.observe = () => undefined;
    this.unobserve = () => undefined;
    this.disconnect = () => undefined;
  }
  globalThis.ResizeObserver = ResizeObserverCtor as unknown as typeof ResizeObserver;
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
    expect(mocks.createCard.mock.calls[0][0]).toMatchObject({
      slug: 'spring-launch',
      title: 'Spring Launch',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports edit mode and calls update', async () => {
    const onClose = vi.fn();
    renderForm(<HeroCardForm card={makeCard()} onClose={onClose} />);
    expect(screen.getByRole('heading', { name: 'Edit Hero Card' })).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Headline'));
    await userEvent.type(screen.getByLabelText('Headline'), 'Updated');
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mocks.updateCard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', title: 'Updated' })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// UX audit A-07: closing the form replaced it with the list and threw the work
// away with no warning.
describe('HeroCardForm unsaved changes', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    clearUnsavedWork();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    clearUnsavedWork();
    confirmSpy.mockRestore();
  });

  it('closes without asking when nothing was typed', async () => {
    const onClose = vi.fn();
    renderForm(<HeroCardForm card={makeCard()} onClose={onClose} />);

    expect(findUnsavedWork()).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /Back/ }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks before Back throws a typed change away', async () => {
    const onClose = vi.fn();
    renderForm(<HeroCardForm card={makeCard()} onClose={onClose} />);

    await userEvent.type(screen.getByLabelText('Headline'), ' updated');
    expect(findUnsavedWork()).not.toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /Back/ }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the form when the admin says no', async () => {
    confirmSpy.mockReturnValue(false);
    const onClose = vi.fn();
    renderForm(<HeroCardForm card={makeCard()} onClose={onClose} />);

    await userEvent.type(screen.getByLabelText('Headline'), ' updated');
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Headline')).toHaveValue('Old updated');
  });

  it('keeps the form and the guard when the save fails', async () => {
    mocks.updateCard.mockRejectedValueOnce(new Error('network'));
    const onClose = vi.fn();
    renderForm(<HeroCardForm card={makeCard()} onClose={onClose} />);

    await userEvent.type(screen.getByLabelText('Headline'), ' updated');
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    // The form stays put with the typed value, and still reports unsaved work.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Headline')).toHaveValue('Old updated');
    await waitFor(() => expect(findUnsavedWork()).not.toBeNull());
  });

  it('does not ask on the close that follows a save', async () => {
    const onClose = vi.fn();
    renderForm(<HeroCardForm card={makeCard()} onClose={onClose} />);

    await userEvent.type(screen.getByLabelText('Headline'), ' updated');
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mocks.updateCard).toHaveBeenCalledTimes(1);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The box is parsed on every keystroke, and for a champions or event card that
  // check refuses a bad shape. It used to do so by throwing, out of render, so
  // one wrong character unmounted the whole admin dashboard.
  describe('extra data that will not parse', () => {
    // Idempotent: the trigger toggles, so clicking it again would close the
    // section the next typeMetadata call needs open.
    const openAdvanced = async () => {
      const alreadyOpen = screen.queryByLabelText('Extra Data (JSON)');
      if (alreadyOpen) return alreadyOpen;
      await userEvent.click(screen.getByRole('button', { name: /advanced settings/i }));
      return screen.getByLabelText('Extra Data (JSON)');
    };

    const typeMetadata = async (value: string) => {
      const box = await openAdvanced();
      await userEvent.clear(box);
      await userEvent.type(box, value.replace(/[{[]/g, '$&$&'));
      return box;
    };

    it('stays on screen and says what is wrong', async () => {
      renderForm(<HeroCardForm card={makeCard({ card_type: 'event' })} onClose={vi.fn()} />);

      await typeMetadata('{"buy_in": 20}');

      // Still mounted: before this fix the throw escaped render and the route
      // boundary took the whole admin dashboard down.
      expect(screen.getByRole('heading', { name: 'Edit Hero Card' })).toBeInTheDocument();
      expect(screen.getByLabelText('Extra Data (JSON)')).toHaveAccessibleDescription(
        /buy_in must be a string/i
      );
    });

    it('will not save the card while it is wrong', async () => {
      const onClose = vi.fn();
      renderForm(<HeroCardForm card={makeCard({ card_type: 'event' })} onClose={onClose} />);

      await typeMetadata('{"buy_in": 20}');

      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
      await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
      expect(mocks.updateCard).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('saves what was typed once it is fixed, not an empty object', async () => {
      renderForm(<HeroCardForm card={makeCard({ card_type: 'event' })} onClose={vi.fn()} />);

      await typeMetadata('{"buy_in": 20}');
      await typeMetadata('{"buy_in": "20"}');

      expect(screen.queryByText(/buy_in must be a string/i)).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => expect(mocks.updateCard).toHaveBeenCalledTimes(1));
      expect(mocks.updateCard).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { buy_in: '20' } })
      );
    });

    // Enter in a single-line field submits the form directly, which never goes
    // near the disabled Save button — so the handler has to refuse as well.
    it('refuses a submit that never touches the Save button', async () => {
      const onClose = vi.fn();
      renderForm(<HeroCardForm card={makeCard({ card_type: 'event' })} onClose={onClose} />);

      const box = await typeMetadata('{"buy_in": 20}');
      const form = box.closest('form');
      expect(form).not.toBeNull();

      fireEvent.submit(form as HTMLFormElement);

      expect(mocks.updateCard).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      // Advanced Settings is collapsed by default, so the refusal opens it to
      // put the reason on screen. It is already open here, and stays open.
      expect(screen.getByLabelText('Extra Data (JSON)')).toBeInTheDocument();
    });

    it('refuses to edit the winners rather than editing against an empty object', async () => {
      renderForm(<HeroCardForm card={makeCard({ card_type: 'event' })} onClose={vi.fn()} />);

      await typeMetadata('{"buy_in": 20, "payouts": "50/30/20"}');

      // Editing here writes { ...metadata, past_winners }, so an empty-object
      // fallback would drop the payouts line the admin also typed.
      expect(screen.queryByRole('button', { name: /add week/i })).not.toBeInTheDocument();
      expect(screen.getByText(/fix "extra data \(json\)"/i)).toBeInTheDocument();
    });
  });
});
