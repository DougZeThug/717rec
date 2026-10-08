import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PackEditorCard from '../PackEditorCard';
import type { PackDraft } from '../useWeeklyContentPack';

const draftWith = (overrides: Partial<PackDraft> = {}): PackDraft => ({
  headline: 'Week 4 recap',
  caption: 'Big night at the courts',
  commissionerNote: 'Rain delay',
  captionSource: 'manual',
  captionModel: null,
  blurbs: {},
  blurbsSource: 'manual',
  ...overrides,
});

const renderCard = (draft: PackDraft) => {
  const onFieldChange = vi.fn();

  render(
    <PackEditorCard
      draft={draft}
      isGeneratingCaption={false}
      isExporting={false}
      onFieldChange={onFieldChange}
      onGenerateCaption={vi.fn()}
      onCopyCaption={vi.fn()}
      onDownload={vi.fn()}
    />
  );

  return { onFieldChange, user: userEvent.setup() };
};

describe('PackEditorCard', () => {
  it('reports headline edits', async () => {
    const { onFieldChange, user } = renderCard(draftWith());

    await user.type(screen.getByLabelText('Headline'), '!');

    expect(onFieldChange).toHaveBeenCalledWith('headline', 'Week 4 recap!');
  });

  it("reports commissioner's note edits", async () => {
    const { onFieldChange, user } = renderCard(draftWith());

    await user.type(screen.getByLabelText("Commissioner's note"), '!');

    expect(onFieldChange).toHaveBeenCalledWith('commissionerNote', 'Rain delay!');
  });

  it('keeps the caption source when the caption was written by hand', async () => {
    const { onFieldChange, user } = renderCard(draftWith({ captionSource: 'manual' }));

    await user.type(screen.getByLabelText('Caption'), '!');

    expect(onFieldChange).toHaveBeenCalledTimes(1);
    expect(onFieldChange).toHaveBeenCalledWith('caption', 'Big night at the courts!');
  });

  it('marks an AI caption as edited once the commissioner changes it', async () => {
    const { onFieldChange, user } = renderCard(draftWith({ captionSource: 'ai' }));

    await user.type(screen.getByLabelText('Caption'), '!');

    expect(onFieldChange).toHaveBeenCalledWith('caption', 'Big night at the courts!');
    expect(onFieldChange).toHaveBeenCalledWith('captionSource', 'ai_edited');
  });
});
