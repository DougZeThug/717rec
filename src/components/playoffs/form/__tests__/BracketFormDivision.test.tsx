
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BracketFormDivision } from '../BracketFormDivision';
import { bracketFormSchema, BracketFormValues } from '../BracketFormSchema';

const mockDivisions = [
  { id: 'div1', name: 'Division 1' },
  { id: 'div2', name: 'Division 2' }
];

const mockOnDivisionChange = vi.fn();

const TestWrapper = () => {
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      divisionId: "",
    },
  });

  return (
    <Form {...form}>
      <form>
        <BracketFormDivision 
          form={form} 
          divisions={mockDivisions} 
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
    
    const division1 = screen.getByText('Division 1');
    const division2 = screen.getByText('Division 2');
    
    expect(division1).toBeInTheDocument();
    expect(division2).toBeInTheDocument();
  });
});
