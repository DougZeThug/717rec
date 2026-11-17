import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AutoScheduleHeader from '../AutoScheduleHeader';
import InformationSection from '../InformationSection';

// Prioritize Match Quality works in Standard mode only, and division comes first. The text on
// the Auto Schedule screen must not promise more than that.
const FALSE_PROMISES = [/never mixes/i, /guarantee/i, /higher priority/i, /optimal/i];

describe('Auto Schedule screen text about match quality', () => {
  it('the header says teams are paired by division first, and skill matching needs Standard mode with the switch ON', () => {
    const { container } = render(<AutoScheduleHeader />);

    const text = container.textContent ?? '';
    expect(text).toContain('Teams are paired by division first');
    expect(text).toContain('With Prioritize Match Quality ON (Standard mode)');
    for (const promise of FALSE_PROMISES) expect(text).not.toMatch(promise);
  });

  it('the help box says division comes first and names the switch and Standard mode', () => {
    const { container } = render(<InformationSection />);

    const text = container.textContent ?? '';
    expect(text).toContain(
      'Teams are matched by division first. With Prioritize Match Quality ON (Standard mode), a close power score and record are preferred next'
    );
    expect(text).not.toContain('Teams are matched based on skill levels using power scores');
  });
});
