import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';
import type { TeamPairingMap } from '@/types/autoSchedule';

import { AlgorithmSettings } from '../components/AlgorithmSettings';
import { InfoFooter } from '../components/InfoFooter';
import ScheduleMatchesPreview from '../ScheduleMatchesPreview';

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('@/components/ui/team/TeamLogo', () => ({ TeamLogo: () => null }));

// Prioritize Match Quality works in Standard mode only, and division comes first. The text on
// the Match Creation screen must not promise more than that.
const FALSE_PROMISES = [/never mixes/i, /guarantee/i, /higher priority/i, /optimal/i];

const makeTeam = (id: string, name: string): Team =>
  ({ id, name, wins: 1, losses: 0 }) as unknown as Team;

describe('Match Creation screen text about match quality', () => {
  it('the switch keeps its name, and its help text says division first, then power score and record', async () => {
    render(
      <AlgorithmSettings
        avoidRematches
        setAvoidRematches={vi.fn()}
        prioritizeQuality={false}
        setPrioritizeQuality={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Algorithm Settings/ }));

    const help = screen.getByText(
      'Pair within a division first, then prefer a close power score and record'
    );
    expect(help).toBeInTheDocument();
    // The help text sits beside the label, not inside it, so the switch name stays exact.
    expect(screen.getByRole('switch', { name: 'Prioritize Match Quality' })).toBeInTheDocument();
    for (const promise of FALSE_PROMISES) expect(help.textContent).not.toMatch(promise);
  });

  it('the footer says teams are matched by division first', () => {
    const { container } = render(<InfoFooter />);

    const text = container.textContent ?? '';
    expect(text).toContain(
      '* Teams are matched by division first. With Prioritize Match Quality ON, a close power score and record are preferred next'
    );
    expect(text).not.toContain('based on skill levels using power scores');
    for (const promise of FALSE_PROMISES) expect(text).not.toMatch(promise);
  });

  it('the preview says what the score means, and that a neighbouring-division pair can show just under 5 in amber without counting as a warning', () => {
    const pairings: TeamPairingMap = {
      Early: [
        {
          team1: makeTeam('t1', 'Alpha'),
          team2: makeTeam('t2', 'Bravo'),
          compatibilityScore: 10,
          hasPlayedBefore: false,
        },
      ],
    };

    const { container } = render(
      <ScheduleMatchesPreview
        pairings={pairings}
        date={new Date(2026, 10, 19)}
        isGenerating={false}
      />
    );

    const text = container.textContent ?? '';
    expect(text).toContain(
      '* Match score is 10 for teams in the same division and 5 for neighbouring divisions. Rematches are flagged'
    );
    expect(text).toContain(
      '* With Prioritize Match Quality ON (Standard mode), a close power score and record are preferred, and a gap takes a little off the score. A neighbouring-division pair can then show just under 5 in amber, and it does not count in the red Warnings badge'
    );
    expect(text).not.toContain('and count in the red Warnings badge');
    expect(text).not.toContain('Teams with similar skill levels are paired');
    for (const promise of FALSE_PROMISES) expect(text).not.toMatch(promise);
  });
  it('does not count a pair that scores just under 5 in the red Warnings badge, and does not count a pair that scores exactly 5 either', () => {
    // With the switch ON, a neighbouring-division pair whose teams are not close scores a little
    // under 5 (4.5 to 5). With the switch OFF the same pair scores exactly 5. Neither is a
    // warning. The amber card stays for the first one: see ScheduleMatchesPreview.warnings.test.tsx.
    const pairingsScoring = (score: number): TeamPairingMap => ({
      Early: [
        {
          team1: makeTeam('t1', 'Alpha'),
          team2: makeTeam('t2', 'Bravo'),
          compatibilityScore: score,
          hasPlayedBefore: false,
        },
      ],
    });
    const date = new Date(2026, 10, 19);

    const on = render(
      <ScheduleMatchesPreview
        pairings={pairingsScoring(4.98828125)}
        date={date}
        isGenerating={false}
      />
    );
    expect(on.queryByText(/^\d+ Warnings$/)).not.toBeInTheDocument();
    on.unmount();

    const off = render(
      <ScheduleMatchesPreview pairings={pairingsScoring(5)} date={date} isGenerating={false} />
    );
    expect(off.queryByText(/^\d+ Warnings$/)).not.toBeInTheDocument();
  });
});
