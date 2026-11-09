import { act, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Tabs, TabsContent } from '@/components/ui/tabs';

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

// The real tab panel. Radix Presence mounts a newly opened panel's children
// from a layout effect, one commit after the tab value changes, so the card is
// not on the page yet when the tab swap is committed.
function RadixTabsHarness({ cardId }: { cardId: string }) {
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeslots');

  useScrollToLinkedMatch(matchesLoading, activeTab);

  return (
    <div>
      <button onClick={() => setMatchesLoading(false)}>finish loading matches</button>
      <button onClick={() => setActiveTab('upcoming')}>swap to upcoming tab</button>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="timeslots">timeslots</TabsContent>
        <TabsContent value="upcoming">
          <div id={cardId} />
        </TabsContent>
      </Tabs>
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
        <RadixTabsHarness cardId="match-A" />
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
