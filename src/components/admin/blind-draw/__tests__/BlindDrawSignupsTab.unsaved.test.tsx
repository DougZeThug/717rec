import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settings = {
  id: 'settings-1',
  signup_confirmation_message: 'See you Thursday.',
};

const mockMutate = vi.fn();

vi.mock('@/hooks/useBlindDrawSettings', () => ({
  useBlindDrawSettings: () => ({ data: settings, isLoading: false }),
  useUpdateBlindDrawSettings: () => ({ mutate: mockMutate, isPending: false }),
}));

let clearSignupsMutation: { mutate: ReturnType<typeof vi.fn>; isPending: boolean };

vi.mock('@/hooks/useBlindDrawSignups', () => ({
  useBlindDrawSignups: () => ({ data: [], isLoading: false, error: null }),
  useDeleteBlindDrawSignup: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useClearBlindDrawSignups: () => clearSignupsMutation,
}));

import { clearUnsavedWork, findUnsavedWork } from '@/utils/unsavedChanges';

import BlindDrawSignupsTab from '../BlindDrawSignupsTab';

describe('Blind Draw signup message', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearUnsavedWork();
    clearSignupsMutation = { mutate: vi.fn(), isPending: false };
  });

  afterEach(() => clearUnsavedWork());

  const messageBox = () => screen.getByDisplayValue('See you Thursday.');

  it('reports nothing unsaved before the message is touched', async () => {
    render(<BlindDrawSignupsTab />);

    await waitFor(() => expect(messageBox()).toBeInTheDocument());
    expect(findUnsavedWork()).toBeNull();
  });

  // UX audit A-07: switching section threw the edit away with no warning.
  it('reports unsaved work once the message is edited', async () => {
    render(<BlindDrawSignupsTab />);

    await waitFor(() => expect(messageBox()).toBeInTheDocument());
    await userEvent.type(messageBox(), ' Bring a friend.');

    await waitFor(() => expect(findUnsavedWork()).not.toBeNull());
    expect(findUnsavedWork()?.message).toMatch(/not saved/i);
  });
});
