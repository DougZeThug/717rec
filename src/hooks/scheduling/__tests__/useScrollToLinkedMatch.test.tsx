import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode, useLayoutEffect, useState } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useScrollToLinkedMatch } from '../useScrollToLinkedMatch';

// Stands in for Schedule: the cards only exist on the open tab, and the page
// swaps tab after the matches have loaded (the smart-default tab).
function ScheduleHarness({ cardId }: { cardId: string }) {
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeslots');

  useScrollToLinkedMatch(matchesLoading, activeTab);

  return (
    <div>
      <button onClick={() => setMatchesLoading(false)}>finish loading matches</button>
      <button onClick={() => setActiveTab('upcoming')}>swap to upcoming tab</button>
      <button onClick={() => setActiveTab('timeslots')}>swap to timeslots tab</button>
      {activeTab === 'upcoming' ? <div id={cardId} /> : null}
    </div>
  );
}

// Stands in for a Radix tab panel: once its tab opens it draws its children
// one commit later, from a layout effect, as Radix Presence does.
function LatePanel({ open, children }: { open: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors Radix Presence on purpose
    setMounted(open);
  }, [open]);
  return mounted ? children : null;
}

function LatePanelHarness({ cardId }: { cardId: string }) {
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeslots');

  useScrollToLinkedMatch(matchesLoading, activeTab);

  return (
    <div>
      <button onClick={() => setMatchesLoading(false)}>finish loading matches</button>
      <button onClick={() => setActiveTab('upcoming')}>swap to upcoming tab</button>
      <LatePanel open={activeTab === 'upcoming'}>
        <div id={cardId} />
      </LatePanel>
    </div>
  );
}

function renderHarness(url: string, cardId = 'match-A') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ScheduleHarness cardId={cardId} />
    </MemoryRouter>
  );
}

describe('useScrollToLinkedMatch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('scrolls to the card once the smart-default tab swap mounts it', () => {
    const scrollIntoView = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => undefined);
    const { getByText } = renderHarness('/schedule?date=2026-09-03#match-A');

    fireEvent.click(getByText('finish loading matches'));
    expect(scrollIntoView).not.toHaveBeenCalled();

    fireEvent.click(getByText('swap to upcoming tab'));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  // The real tab panel draws its cards one commit after the tab opens, so the
  // look that ran on the tab swap found nothing and nothing looked again.
  it('still finds a card that the opened tab draws one commit later', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    const scrollIntoView = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => undefined);
    const { getByText } = render(
      <MemoryRouter initialEntries={['/schedule?date=2026-09-03#match-A']}>
        <LatePanelHarness cardId="match-A" />
      </MemoryRouter>
    );

    fireEvent.click(getByText('finish loading matches'));
    fireEvent.click(getByText('swap to upcoming tab'));
    expect(scrollIntoView).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersToNextFrame();
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does not scroll when the link names no match', () => {
    const scrollIntoView = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => undefined);
    const { getByText } = renderHarness('/schedule?date=2026-09-03');

    fireEvent.click(getByText('finish loading matches'));
    fireEvent.click(getByText('swap to upcoming tab'));

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not scroll again when the reader changes tab afterwards', () => {
    const scrollIntoView = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => undefined);
    const { getByText } = renderHarness('/schedule?date=2026-09-03#match-A');

    fireEvent.click(getByText('finish loading matches'));
    fireEvent.click(getByText('swap to upcoming tab'));
    fireEvent.click(getByText('swap to timeslots tab'));
    fireEvent.click(getByText('swap to upcoming tab'));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
