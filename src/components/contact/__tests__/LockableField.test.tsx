import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LockableField } from '../LockableField';

const renderField = (locked: boolean) =>
  render(
    <LockableField
      id="contact-name"
      label="Name"
      value="Pat"
      onChange={vi.fn()}
      locked={locked}
      maxLength={100}
      placeholder="Your name"
    />
  );

describe('LockableField', () => {
  it('locks a verified value and marks it Verified', () => {
    renderField(true);

    expect(screen.getByLabelText(/Name/)).toHaveAttribute('readonly');
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('leaves a typed value editable with no badge', () => {
    renderField(false);

    expect(screen.getByLabelText('Name')).not.toHaveAttribute('readonly');
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  // jsdom has no colours, so this pins the classes. emerald-600 was 3.4:1 on the light page
  // background for this 12px text; emerald-700 passes 4.5:1. Dark keeps emerald-400.
  it('draws the Verified badge in a shade that reads in light and dark', () => {
    renderField(true);

    const badge = screen.getByText('Verified');
    expect(badge).toHaveClass('text-emerald-700', 'dark:text-emerald-400');
    expect(badge).not.toHaveClass('text-emerald-600');
  });
});
