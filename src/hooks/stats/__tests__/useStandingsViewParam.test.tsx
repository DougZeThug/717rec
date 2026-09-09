import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useStandingsViewParam } from '../useStandingsViewParam';

const Probe = () => {
  const [view, setView] = useStandingsViewParam();
  const location = useLocation();
  return (
    <>
      <div data-testid="view">{view}</div>
      <div data-testid="url">{location.pathname + location.search}</div>
      <button onClick={() => setView('all')}>all</button>
      <button onClick={() => setView('division')}>division</button>
    </>
  );
};

const renderProbe = (initialPath = '/stats') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Probe />
    </MemoryRouter>
  );

const view = () => screen.getByTestId('view').textContent;
const url = () => screen.getByTestId('url').textContent;

describe('useStandingsViewParam', () => {
  it('shows divisions when the address says nothing', () => {
    renderProbe();

    expect(view()).toBe('division');
    expect(url()).toBe('/stats');
  });

  it('reads the all-teams view from the address', () => {
    renderProbe('/stats?view=all');

    expect(view()).toBe('all');
  });

  it('falls back to divisions for a value it does not know', () => {
    renderProbe('/stats?view=sideways');

    expect(view()).toBe('division');
  });

  it('writes the all-teams view, and removes it again on the way back', () => {
    renderProbe();

    act(() => screen.getByText('all').click());
    expect(url()).toBe('/stats?view=all');
    expect(view()).toBe('all');

    // The default is no parameter, so a plain /stats stays plain.
    act(() => screen.getByText('division').click());
    expect(url()).toBe('/stats');
  });

  it('leaves an unrelated parameter alone', () => {
    renderProbe('/stats?ref=email');

    act(() => screen.getByText('all').click());

    expect(url()).toContain('ref=email');
    expect(url()).toContain('view=all');
  });
});
