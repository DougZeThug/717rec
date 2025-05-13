
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BracketFormChallonge } from '../BracketFormChallonge';
import { bracketFormSchema, BracketFormValues } from '../BracketFormSchema';

const TestWrapper = () => {
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      useChallonge: true,
    },
  });

  return (
    <Form {...form}>
      <form>
        <BracketFormChallonge form={form} />
      </form>
    </Form>
  );
};

describe('BracketFormChallonge', () => {
  it('renders the Challonge integration checkbox', () => {
    render(<TestWrapper />);
    
    const challongeLabel = screen.getByText(/use challonge integration/i);
    expect(challongeLabel).toBeInTheDocument();
  });

  it('shows descriptive text about Challonge integration', () => {
    render(<TestWrapper />);
    
    const description = screen.getByText(/create tournament in challonge for professional bracket visualization/i);
    expect(description).toBeInTheDocument();
  });

  it('has the checkbox checked by default', () => {
    render(<TestWrapper />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('allows toggling the checkbox', async () => {
    render(<TestWrapper />);
    
    const user = userEvent.setup();
    const checkbox = screen.getByRole('checkbox');
    
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
