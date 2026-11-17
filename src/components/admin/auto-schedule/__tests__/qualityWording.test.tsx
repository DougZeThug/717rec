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

  it('the help box does not promise the most competitive or fair matches, which is false with the switch OFF and in Dual Match Mode', () => {
    const { container } = render(<InformationSection />);

    const text = container.textContent ?? '';
    expect(text).toContain(
      'A pair from the same division scores highest, then a pair from neighbouring divisions'
    );
    expect(text).not.toContain('optimized to be as competitive and fair as possible');
    expect(text).not.toMatch(/optimi[sz]ed/i);
  });
});
