import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { RecapTeamGrade } from '@/types/recapEdition';

import BlurbEditorCard from '../BlurbEditorCard';

const team = (overrides: Partial<RecapTeamGrade> = {}): RecapTeamGrade => ({
  rank: 1,
  previousRank: 2,
  teamId: 't-1',
  teamName: 'Bag Chasers',
  logoUrl: null,
  division: 'Competitive',
  grade: 'A',
  gpa: 3.8,
  categories: [],
  wins: 6,
  losses: 2,
  powerScore: 72.4,
  delta: 2.1,
  ...overrides,
});

const renderCard = (props: Partial<React.ComponentProps<typeof BlurbEditorCard>> = {}) => {
  const onBlurbChange = vi.fn();
  const onGenerateBlurbs = vi.fn();

  render(
    <BlurbEditorCard
      rankings={[team()]}
      blurbs={{}}
      blurbsSource="fallback"
      isGeneratingBlurbs={false}
      onBlurbChange={onBlurbChange}
      onGenerateBlurbs={onGenerateBlurbs}
      {...props}
    />
  );

  return { onBlurbChange, onGenerateBlurbs };
};

describe('BlurbEditorCard', () => {
  it('renders nothing before a week has been generated', () => {
    const { container } = render(
      <BlurbEditorCard
        rankings={[]}
        blurbs={{}}
        blurbsSource="manual"
        isGeneratingBlurbs={false}
        onBlurbChange={vi.fn()}
        onGenerateBlurbs={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('counts the teams in the heading', () => {
    renderCard({ rankings: [team({ teamId: 'a' }), team({ teamId: 'b', rank: 2 })] });
    expect(screen.getByText('Power rankings (2 teams)')).toBeInTheDocument();
  });

  it('gives every team its own labelled box', () => {
    renderCard({
      rankings: [
        team({ teamId: 'a', teamName: 'Alpha' }),
        team({ teamId: 'b', teamName: 'Beta', rank: 2 }),
      ],
      blurbs: { a: 'Top of the pile.' },
    });

    expect(screen.getByLabelText('Blurb for Alpha')).toHaveValue('Top of the pile.');
    expect(screen.getByLabelText('Blurb for Beta')).toHaveValue('');
  });

  it('reports which team was edited', async () => {
    const user = userEvent.setup();
    const { onBlurbChange } = renderCard();

    await user.type(screen.getByLabelText('Blurb for Bag Chasers'), 'X');

    expect(onBlurbChange).toHaveBeenCalledWith('t-1', 'X');
  });

  it('shows places gained and lost beside each team', () => {
    renderCard({
      rankings: [
        team({ teamId: 'up', teamName: 'Climbers', rank: 1, previousRank: 4 }),
        team({ teamId: 'down', teamName: 'Sliders', rank: 2, previousRank: 1 }),
        team({ teamId: 'same', teamName: 'Steady', rank: 3, previousRank: 3 }),
        team({ teamId: 'new', teamName: 'Newcomers', rank: 4, previousRank: null }),
      ],
    });

    expect(screen.getByText('▲3')).toBeInTheDocument();
    expect(screen.getByText('▼1')).toBeInTheDocument();
    expect(screen.getByText('▬')).toBeInTheDocument();
    // A team with no previous week gets a dash, not an invented climb.
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows a dash instead of a letter for an unrated team', () => {
    renderCard({ rankings: [team({ grade: null })] });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('says where the current lines came from', () => {
    renderCard({ blurbsSource: 'ai_edited' });
    expect(screen.getByText('AI drafts, edited by you.')).toBeInTheDocument();
  });

  it('offers to write the lines, and disables the button while it does', async () => {
    const user = userEvent.setup();
    const { onGenerateBlurbs } = renderCard();

    await user.click(screen.getByRole('button', { name: /write blurbs for me/i }));
    expect(onGenerateBlurbs).toHaveBeenCalledOnce();

    renderCard({ isGeneratingBlurbs: true });
    const buttons = screen.getAllByRole('button', { name: /write blurbs for me/i });
    expect(buttons[buttons.length - 1]).toBeDisabled();
  });

  it('caps a line at the length the graphic can show', () => {
    renderCard();
    expect(screen.getByLabelText('Blurb for Bag Chasers')).toHaveAttribute('maxlength', '120');
  });
});
