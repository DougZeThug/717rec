
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BracketFormFormat } from '../BracketFormFormat';
import { bracketFormSchema, BracketFormValues } from '../BracketFormSchema';
import { BRACKET_FORMATS } from "@/constants/brackets";

const TestWrapper = () => {
  const form = useForm({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: "",
      format: BRACKET_FORMATS.DOUBLE as "Double Elimination",
      teams: [] as string[],
      grandFinalType: "simple" as const,
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
    
    const singleElimination = screen.getByText(BRACKET_FORMATS.SINGLE);
    const doubleElimination = screen.getByText(BRACKET_FORMATS.DOUBLE);
    
    expect(singleElimination).toBeInTheDocument();
    expect(doubleElimination).toBeInTheDocument();
  });

  it('has Double Elimination selected by default', () => {
    render(<TestWrapper />);
    
    const selectTrigger = screen.getByText(BRACKET_FORMATS.DOUBLE);
    expect(selectTrigger).toBeInTheDocument();
  });
});
