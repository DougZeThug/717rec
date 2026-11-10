import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AdminSectionWrapper from '../AdminSectionWrapper';

describe('AdminSectionWrapper', () => {
  // jsdom does no layout, so this pins the classes. The admin page already pads the screen by
  // 16px on a phone; the section's own padding put it 16px further in than the Sections bar.
  it('pads the section only from md up, so on a phone it lines up with the Sections bar', () => {
    render(
      <AdminSectionWrapper title="Mass Score Entry">
        <p>Body</p>
      </AdminSectionWrapper>
    );

    const titleRow = screen.getByRole('heading', { name: 'Mass Score Entry' }).parentElement;
    const section = titleRow?.parentElement;

    expect(section).toHaveClass('md:px-4', 'md:py-6', 'max-w-[1200px]', 'mx-auto', 'w-full');
    expect(section).not.toHaveClass('px-4');
    expect(section).not.toHaveClass('py-6');
    expect(titleRow).toHaveClass('mb-4', 'md:mb-6');
    expect(titleRow).not.toHaveClass('mb-6');
  });
});
