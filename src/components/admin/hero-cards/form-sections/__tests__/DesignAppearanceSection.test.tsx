import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeroCardFormData } from '@/types/heroCard';

import { DesignAppearanceSection } from '../DesignAppearanceSection';

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/utils/imageUpload', () => ({ uploadHeroCardImage: vi.fn() }));
// The colour and icon pickers are not under test and need browser layout.
vi.mock('../../ColorPresetPicker', () => ({ ColorPresetPicker: () => null }));
vi.mock('../../IconPicker', () => ({ IconPicker: () => null }));

const flyerForm: HeroCardFormData = {
  slug: 's',
  title: 't',
  subtitle: '',
  body: '',
  cta_label: '',
  cta_url: '',
  background_color: '',
  text_color: '',
  accent_color: '',
  image_url: '',
  icon_name: '',
  is_visible: false,
  sort_order: 0,
  target_type: 'none',
  target_id: '',
  card_type: 'flyer',
  metadata: '{}',
};

describe('DesignAppearanceSection flyer upload zone', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderZone = () => {
    render(<DesignAppearanceSection formData={flyerForm} onChange={vi.fn()} />);
    const zone = screen.getByRole('button', {
      name: 'Upload flyer image — click or drop image here',
    });
    const picker = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);
    return { zone, picker };
  };

  it('opens the file picker when Enter is pressed, without scrolling the page', () => {
    const { zone, picker } = renderZone();

    // fireEvent returns false when the handler called preventDefault.
    const notPrevented = fireEvent.keyDown(zone, { key: 'Enter' });

    expect(notPrevented).toBe(false);
    expect(picker).toHaveBeenCalledTimes(1);
  });

  // Like a real button, Space acts when it is released, so holding it or
  // pressing it by mistake and sliding off does nothing.
  it('opens the file picker when Space is released, not when it is pressed', () => {
    const { zone, picker } = renderZone();

    const notPrevented = fireEvent.keyDown(zone, { key: ' ' });
    expect(notPrevented).toBe(false);
    expect(picker).not.toHaveBeenCalled();

    fireEvent.keyUp(zone, { key: ' ' });
    expect(picker).toHaveBeenCalledTimes(1);
  });

  it('leaves other keys alone', () => {
    const { zone, picker } = renderZone();

    const notPrevented = fireEvent.keyDown(zone, { key: 'Tab' });

    expect(notPrevented).toBe(true);
    expect(picker).not.toHaveBeenCalled();
  });
});
