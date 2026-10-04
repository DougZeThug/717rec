import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TeamSelectionForm } from '../bracket-teams/components/TeamSelectionForm';
import type { BracketFormStateResult, ProcessedTeam } from '../bracket-teams/types';

const { mockUseFormStateManager } = vi.hoisted(() => ({ mockUseFormStateManager: vi.fn() }));

vi.mock('../bracket-teams/hooks/useFormStateManager', () => ({
  useFormStateManager: mockUseFormStateManager,
}));

const team = { id: 'team-1', name: 'Team Alpha', seed: 1 } as ProcessedTeam;

const formState = {
  selected: new Set(['team-1']),
  selectedArray: ['team-1'],
  count: 1,
  handleTeamToggle: vi.fn(),
  clearSelection: vi.fn(),
  canSelectMore: true,
  isAtMaximum: false,
  hasSelection: true,
  isValid: false,
  isComplete: false,
  hasError: false,
  hasWarning: false,
  errorMessage: null,
  warningMessage: null,
  statusMessage: 'Pick more teams',
  progress: { percentage: 10 },
} as BracketFormStateResult;

const manager = (overrides: Record<string, unknown> = {}) => ({
  syncedTeams: [team],
  hasUnsavedChanges: false,
  canSave: true,
  saveAllChanges: vi.fn(),
  cancelAllChanges: vi.fn(),
  seedManagementState: { state: { pendingChanges: new Set<string>(), mode: 'auto' } },
  ...overrides,
});

const renderForm = () =>
  render(
    <MemoryRouter>
      <TeamSelectionForm teams={[team]} formState={formState} maxTeams={16} minTeams={2} />
    </MemoryRouter>
  );

describe('TeamSelectionForm unsaved seed changes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows no save or cancel controls when nothing has changed', () => {
    mockUseFormStateManager.mockReturnValue(manager());
    renderForm();

    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });

  it('shows save and cancel while there are unsaved seed edits, and wires both', async () => {
    const user = userEvent.setup();
    const state = manager({ hasUnsavedChanges: true });
    mockUseFormStateManager.mockReturnValue(state);
    renderForm();

    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(state.saveAllChanges).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(state.cancelAllChanges).toHaveBeenCalledTimes(1);
  });

  it('disables Save when the edits cannot be saved yet', () => {
    mockUseFormStateManager.mockReturnValue(manager({ hasUnsavedChanges: true, canSave: false }));
    renderForm();

    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });
});
