import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Trophy } from 'lucide-react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';

const mocks = vi.hoisted(() => ({ winter: false }));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ shouldApplyWinterBase: mocks.winter }),
}));
vi.mock('@/icons', () => ({
  WINTER_ICONS_ENABLED: true,
  SnowflakeSparkle: () => <span data-testid="snowflake" />,
}));

const setup = (props: Partial<React.ComponentProps<typeof CollapsibleSection>> = {}) =>
  render(
    <CollapsibleSection title="Roster" icon={Trophy} headingId="roster-heading" {...props}>
      <p>Four players</p>
    </CollapsibleSection>
  );

describe('CollapsibleSection', () => {
  it('opens and closes the content from the heading button', async () => {
    const user = userEvent.setup();
    setup();

    const trigger = screen.getByRole('button', { name: /roster/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Four players')).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Four players')).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByText('Four players')).not.toBeInTheDocument();
  });

  it('gives the heading its id so a link can name it', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Roster' })).toHaveAttribute('id', 'roster-heading');
  });

  it('shows the summary only while closed', async () => {
    const user = userEvent.setup();
    setup({ summaryValue: '4 players' });

    expect(screen.getByText('4 players')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /roster/i }));
    expect(screen.queryByText('4 players')).not.toBeInTheDocument();
  });

  it('starts open when asked and adds the winter snowflake in the winter theme', () => {
    mocks.winter = true;
    setup({ defaultOpen: true });

    expect(screen.getByText('Four players')).toBeInTheDocument();
    expect(screen.getByTestId('snowflake')).toBeInTheDocument();
    mocks.winter = false;
  });
});
