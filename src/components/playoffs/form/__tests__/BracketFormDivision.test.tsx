import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { Form } from '@/components/ui/form';

import { BracketFormDivision } from '../BracketFormDivision';
import { bracketFormSchema } from '../BracketFormSchema';

const mockDivisions = [
  { id: 'div1', name: 'Division 1' },
  { id: 'div2', name: 'Division 2' },
];

const mockOnDivisionChange = vi.fn();

const TestWrapper = ({ divisions = mockDivisions }: { divisions?: typeof mockDivisions }) => {
  const form = useForm({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: '',
      divisionId: '',
      format: 'Single Elimination' as const,
      teams: [] as string[],
      grandFinalType: 'simple' as const,
    },
  });

  return (
    <Form {...form}>
      <form>
        <BracketFormDivision
          form={form}
          divisions={divisions}
          onDivisionChange={mockOnDivisionChange}
        />
      </form>
    </Form>
  );
};

describe('BracketFormDivision', () => {
  it('renders the division select field', () => {
    render(<TestWrapper />);

    const divisionLabel = screen.getByLabelText(/division/i);
    expect(divisionLabel).toBeInTheDocument();
  });

  it('displays all provided divisions', async () => {
    render(<TestWrapper />);

    const user = userEvent.setup();
    const selectTrigger = screen.getByRole('combobox');

    await user.click(selectTrigger);

    const division1 = screen.getAllByText('Division 1');
    const division2 = screen.getAllByText('Division 2');

    expect(division1[0]).toBeInTheDocument();
    expect(division2[0]).toBeInTheDocument();
  });

  it('tells the admin to create divisions when none exist', () => {
    render(<TestWrapper divisions={[]} />);

    expect(screen.getByText('Division')).toBeInTheDocument();
    expect(
      screen.getByText('No divisions available. Please create divisions first.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows the same message when only the Hidden division exists', () => {
    render(<TestWrapper divisions={[{ id: 'hidden', name: 'Hidden' }]} />);

    expect(
      screen.getByText('No divisions available. Please create divisions first.')
    ).toBeInTheDocument();
  });
});
