import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import PublishCard from '../PublishCard';

const renderCard = (props: Partial<React.ComponentProps<typeof PublishCard>> = {}) => {
  const onSave = vi.fn();
  const onPublish = vi.fn();
  const onUnpublish = vi.fn();

  render(
    <MemoryRouter>
      <PublishCard
        isCorrection={false}
        isPublished={false}
        publicPath="/recap/fall-2026/week-6"
        canPublish
        isDirty
        isSaving={false}
        isPublishing={false}
        onSave={onSave}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
        isUnpublishing={false}
        {...props}
      />
    </MemoryRouter>
  );

  return { onSave, onPublish, onUnpublish };
};

describe('PublishCard', () => {
  it('publishes without a note the first time', async () => {
    const user = userEvent.setup();
    const { onPublish } = renderCard();

    expect(screen.getByRole('heading', { name: 'Publish' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(onPublish).toHaveBeenCalledWith(undefined);
  });

  it('asks what changed when publishing over a live edition', async () => {
    const user = userEvent.setup();
    const { onPublish } = renderCard({ isCorrection: true, isPublished: true });

    expect(screen.getByRole('heading', { name: 'Publish a correction' })).toBeInTheDocument();
    // Says plainly that the live version is kept, not overwritten.
    expect(screen.getByText(/kept, not\s+overwritten/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('What changed?'), 'Score was wrong.');
    await user.click(screen.getByRole('button', { name: 'Publish correction' }));

    expect(onPublish).toHaveBeenCalledWith('Score was wrong.');
  });

  it('sends no note when the correction box is left blank', async () => {
    const user = userEvent.setup();
    const { onPublish } = renderCard({ isCorrection: true, isPublished: true });

    await user.type(screen.getByLabelText('What changed?'), '   ');
    await user.click(screen.getByRole('button', { name: 'Publish correction' }));

    expect(onPublish).toHaveBeenCalledWith(undefined);
  });

  it('links to the live page once published, and offers to take it down', async () => {
    const user = userEvent.setup();
    const { onUnpublish } = renderCard({ isPublished: true });

    expect(screen.getByRole('link', { name: /\/recap\/fall-2026\/week-6/ })).toHaveAttribute(
      'href',
      '/recap/fall-2026/week-6'
    );
    expect(screen.getByText(/Every version stays on file/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(onUnpublish).toHaveBeenCalledOnce();
  });

  it('hides unpublish for a week that was never published', () => {
    renderCard({ isPublished: false });
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
  });

  it('will not save a draft with nothing to save', () => {
    renderCard({ isDirty: false });
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  });

  it('explains why publishing is off rather than just greying out', () => {
    renderCard({ canPublish: false });

    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText(/See the warnings above/)).toBeInTheDocument();
  });

  it('disables the buttons while work is in flight', () => {
    renderCard({ isSaving: true, isPublishing: true, isPublished: true, isUnpublishing: true });

    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeDisabled();
  });
});
