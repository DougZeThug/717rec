import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { Form } from '@/components/ui/form';
import { BRACKET_FORMATS } from '@/constants/brackets';

import { BracketFormFormat } from '../BracketFormFormat';
import { bracketFormSchema, BracketFormValues } from '../BracketFormSchema';

const TestWrapper = () => {
  const form = useForm({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: '',
      divisionId: '',
      format: BRACKET_FORMATS.DOUBLE as 'Double Elimination',
      teams: [] as string[],
      grandFinalType: 'simple' as const,
    },
  });

  return (
    <Form {...form}>
      <form>
        <BracketFormFormat form={form} />
      </form>
    </Form>
  );
};

describe('BracketFormFormat', () => {
  it('renders the format select field', () => {
    render(<TestWrapper />);

    const formatLabel = screen.getByLabelText(/tournament format/i);
    expect(formatLabel).toBeInTheDocument();
  });

  it('displays both format options', async () => {
    render(<TestWrapper />);

    const user = userEvent.setup();
    const selectTrigger = screen.getByRole('combobox');

    await user.click(selectTrigger);

    const singleElimination = screen.getAllByText(BRACKET_FORMATS.SINGLE);
    const doubleElimination = screen.getAllByText(BRACKET_FORMATS.DOUBLE);

    expect(singleElimination[0]).toBeInTheDocument();
    expect(doubleElimination[0]).toBeInTheDocument();
  });

  it('has Double Elimination selected by default', () => {
    render(<TestWrapper />);

    const selectTriggers = screen.getAllByText(BRACKET_FORMATS.DOUBLE);
    expect(selectTriggers[0]).toBeInTheDocument();
  });
});
