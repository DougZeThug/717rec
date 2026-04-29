import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockCreateMutateAsync, mockUpdateMutateAsync, mockToast } = vi.hoisted(() => ({
  mockCreateMutateAsync: vi.fn(),
  mockUpdateMutateAsync: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('@/hooks/useSeasonMutations', () => ({
  useSeasonMutations: () => ({
    createSeason: { mutateAsync: mockCreateMutateAsync },
    updateSeason: { mutateAsync: mockUpdateMutateAsync },
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ theme: 'light' }),
  default: () => ({ isWinterTheme: false }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { Season } from '@/types/season';

import SeasonForm from '../SeasonForm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockSeason: Season = {
  id: 'season-1',
  name: 'Spring 2025',
  start_date: '2025-03-01',
  end_date: '2025-06-01',
  is_active: false,
  created_at: '2025-01-01T00:00:00Z',
  is_archived: false,
  playoffs_active: false,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SeasonForm', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMutateAsync.mockResolvedValue({ id: 'new-season' });
    mockUpdateMutateAsync.mockResolvedValue({ id: 'season-1' });
  });

  describe('create mode (no season prop)', () => {
    it('shows "Create New Season" title', () => {
      render(<SeasonForm onClose={mockOnClose} />);
      expect(screen.getByText('Create New Season')).toBeInTheDocument();
    });

    it('shows "Create Season" button text', () => {
      render(<SeasonForm onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: /create season/i })).toBeInTheDocument();
    });

    it('shows empty fields', () => {
      render(<SeasonForm onClose={mockOnClose} />);
      expect(screen.getByPlaceholderText(/e\.g\., Spring 2025/i)).toHaveValue('');
    });

    it('shows validation error when name is empty on submit', async () => {
      render(<SeasonForm onClose={mockOnClose} />);

      // Fill start_date to avoid that error, leave name empty
      fireEvent.change(screen.getAllByDisplayValue('')[1], {
        target: { value: '2025-03-01' },
      });

      await userEvent.click(screen.getByRole('button', { name: /create season/i }));

      await waitFor(() => {
        expect(screen.getByText('Season name is required')).toBeInTheDocument();
      });
      expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    });

    it('shows validation error when start_date is empty on submit', async () => {
      render(<SeasonForm onClose={mockOnClose} />);

      // Fill name but leave start_date empty
      await userEvent.type(screen.getByPlaceholderText(/e\.g\., Spring 2025/i), 'Fall 2025');

      await userEvent.click(screen.getByRole('button', { name: /create season/i }));

      await waitFor(() => {
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
      });
      expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    });

    it('calls createSeason.mutateAsync with correct data on valid submit', async () => {
      render(<SeasonForm onClose={mockOnClose} />);

      await userEvent.type(screen.getByPlaceholderText(/e\.g\., Spring 2025/i), 'Fall 2025');
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2025-09-01' },
      });

      await userEvent.click(screen.getByRole('button', { name: /create season/i }));

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Fall 2025', start_date: '2025-09-01' })
        );
      });
    });

    it('calls onClose after successful create', async () => {
      render(<SeasonForm onClose={mockOnClose} />);

      await userEvent.type(screen.getByPlaceholderText(/e\.g\., Spring 2025/i), 'Fall 2025');
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2025-09-01' },
      });

      await userEvent.click(screen.getByRole('button', { name: /create season/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows error toast and does not call onClose when service throws', async () => {
      mockCreateMutateAsync.mockRejectedValue(new Error('Database error'));
      render(<SeasonForm onClose={mockOnClose} />);

      await userEvent.type(screen.getByPlaceholderText(/e\.g\., Spring 2025/i), 'Fall 2025');
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2025-09-01' },
      });

      await userEvent.click(screen.getByRole('button', { name: /create season/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('cancel button calls onClose immediately', async () => {
      render(<SeasonForm onClose={mockOnClose} />);
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('edit mode (season prop provided)', () => {
    it('shows "Edit Season" title', () => {
      render(<SeasonForm season={mockSeason} onClose={mockOnClose} />);
      expect(screen.getByText('Edit Season')).toBeInTheDocument();
    });

    it('shows "Update Season" button text', () => {
      render(<SeasonForm season={mockSeason} onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: /update season/i })).toBeInTheDocument();
    });

    it('pre-fills name field with season name', () => {
      render(<SeasonForm season={mockSeason} onClose={mockOnClose} />);
      expect(screen.getByDisplayValue('Spring 2025')).toBeInTheDocument();
    });

    it('pre-fills start_date field', () => {
      render(<SeasonForm season={mockSeason} onClose={mockOnClose} />);
      expect(screen.getByDisplayValue('2025-03-01')).toBeInTheDocument();
    });

    it('calls updateSeason.mutateAsync with id on valid submit', async () => {
      render(<SeasonForm season={mockSeason} onClose={mockOnClose} />);

      await userEvent.click(screen.getByRole('button', { name: /update season/i }));

      await waitFor(() => {
        expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'season-1', name: 'Spring 2025' })
        );
      });
    });

    it('does not call createSeason in edit mode', async () => {
      render(<SeasonForm season={mockSeason} onClose={mockOnClose} />);

      await userEvent.click(screen.getByRole('button', { name: /update season/i }));

      await waitFor(() => {
        expect(mockUpdateMutateAsync).toHaveBeenCalled();
      });
      expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    });
  });
});
