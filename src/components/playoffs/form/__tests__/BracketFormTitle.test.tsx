
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BracketFormTitle } from '../BracketFormTitle';
import { bracketFormSchema, BracketFormValues } from '../BracketFormSchema';

const TestWrapper = () => {
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
    },
  });

  return (
    <Form {...form}>
      <form>
        <BracketFormTitle form={form} />
      </form>
    </Form>
  );
};

describe('BracketFormTitle', () => {
  it('renders the title input field', () => {
    render(<TestWrapper />);
    
    const titleInput = screen.getByLabelText(/bracket title/i);
    expect(titleInput).toBeInTheDocument();
  });

  it('allows entering text in the title field', async () => {
    render(<TestWrapper />);
    
    const user = userEvent.setup();
    const titleInput = screen.getByPlaceholderText(/enter bracket title/i);
    
    await user.type(titleInput, 'Test Tournament');
    expect(titleInput).toHaveValue('Test Tournament');
  });
});
