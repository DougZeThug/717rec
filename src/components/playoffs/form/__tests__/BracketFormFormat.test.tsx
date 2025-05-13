
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BracketFormFormat } from '../BracketFormFormat';
import { bracketFormSchema, BracketFormValues } from '../BracketFormSchema';

const TestWrapper = () => {
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      format: "Double Elimination",
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
    
    const singleElimination = screen.getByText('Single Elimination');
    const doubleElimination = screen.getByText('Double Elimination');
    
    expect(singleElimination).toBeInTheDocument();
    expect(doubleElimination).toBeInTheDocument();
  });

  it('has Double Elimination selected by default', () => {
    render(<TestWrapper />);
    
    const selectTrigger = screen.getByText('Double Elimination');
    expect(selectTrigger).toBeInTheDocument();
  });
});
