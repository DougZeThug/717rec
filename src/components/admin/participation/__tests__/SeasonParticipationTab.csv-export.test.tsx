import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseSeasonParticipations = vi.fn();
let seasons: Array<{ id: string; name: string; is_active: boolean }> | undefined;

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => ({ data: seasons, isLoading: false }),
}));

let teams: Array<{ id: string; name: string; divisionName?: string | null }> = [];

vi.mock('@/hooks/useTeams', () => ({
  useTeams: () => ({ teams, isLoading: false }),
}));

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));

vi.mock('@/hooks/useSeasonParticipation', () => ({
  useSeasonParticipations: (seasonId?: string) => mockUseSeasonParticipations(seasonId),
}));

import SeasonParticipationTab from '../SeasonParticipationTab';

// Minimal RFC-4180 single-row parser, so the test proves the file round-trips.
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i <= line.length) {
    let value = '';
    if (line[i] === '"') {
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          value += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++;
          break;
        } else {
          value += line[i];
          i++;
        }
      }
    } else {
      while (i < line.length && line[i] !== ',') {
        value += line[i];
        i++;
      }
    }
    result.push(value);
    if (line[i] === ',') i++;
    else break;
  }
  return result;
}

describe('SeasonParticipationTab CSV export', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    seasons = [{ id: 'season-active', name: 'Active Season', is_active: true }];
    teams = [
      { id: 'team-1', name: 'Team "Winners"', divisionName: 'Competitive' },
      { id: 'team-2', name: 'Plain', divisionName: null },
    ];
    mockUseSeasonParticipations.mockReturnValue({
      data: [
        {
          team_id: 'team-1',
          status: 'PLAYING',
          updated_at: null,
          submitted_by_name: 'Al"ice',
        },
      ],
      isLoading: false,
    });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('exports valid CSV when team and submitter names contain double quotes', async () => {
    const createdBlobs: Blob[] = [];
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      createdBlobs.push(blob as Blob);
      return 'blob:test-url';
    };
    URL.revokeObjectURL = vi.fn();

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SeasonParticipationTab />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /Export CSV/i }));

    expect(createdBlobs).toHaveLength(1);
    const lines = (await createdBlobs[0].text()).split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Team Name,Division,Status,Updated At,Submitted By');

    expect(lines[1]).toContain('""Winners""');
    expect(lines[1]).toContain('Al""ice');

    const row1 = parseCSVRow(lines[1]);
    expect(row1).toHaveLength(5);
    expect(row1[0]).toBe('Team "Winners"');
    expect(row1[1]).toBe('Competitive');
    expect(row1[2]).toBe('PLAYING');
    expect(row1[4]).toBe('Al"ice');

    const row2 = parseCSVRow(lines[2]);
    expect(row2).toHaveLength(5);
    expect(row2[0]).toBe('Plain');
    expect(row2[2]).toBe('NO_RESPONSE');
  });
});
