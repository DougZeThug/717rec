import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
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
