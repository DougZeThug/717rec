import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

export type StandingsView = 'division' | 'all';

const DEFAULT_VIEW: StandingsView = 'division';
const PARAM = 'view';

/**
 * Keeps the Division / All choice on the standings in the address.
 *
 * It used to reset on every visit, so a link to the whole-league table could not
 * be shared. See UX audit X-14 and T-02.
 *
 * The value is read straight from the address rather than mirrored into state,
 * so there is nothing to keep in step and no chance of writing a default over an
 * incoming link. The default is written as *no* parameter, which keeps a plain
 * `/stats` plain and makes `/stats?view=all` the shareable form. Writes replace
 * the current history entry: the toggle is a view control, not a place.
 */
export const useStandingsViewParam = (): [StandingsView, (view: StandingsView) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();

  const view: StandingsView = searchParams.get(PARAM) === 'all' ? 'all' : DEFAULT_VIEW;

  const setView = useCallback(
    (next: StandingsView) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next === DEFAULT_VIEW) params.delete(PARAM);
          else params.set(PARAM, next);
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return [view, setView];
};
