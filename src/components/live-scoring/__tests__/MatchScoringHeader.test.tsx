import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { MatchScoringHeader } from '../MatchScoringHeader';

const renderHeader = (realtimeStatus: string, canScore = true) =>
  render(
    <MatchScoringHeader
      team1Name="Baggers"
      team2Name="Tossers"
      team1Logo={null}
      team2Logo={null}
      gameWins={{ team1: 1, team2: 0 }}
      canScore={canScore}
      realtimeStatus={realtimeStatus}
    />
  );

describe('MatchScoringHeader', () => {
  it('says live updates are on once the channel is subscribed', () => {
    renderHeader('SUBSCRIBED');

    expect(screen.getByTestId('realtime-status')).toHaveTextContent('Live updates: on');
    expect(screen.getByTestId('realtime-status')).not.toHaveTextContent('still save');
  });

  it('says connecting before the channel has answered', () => {
    renderHeader('connecting');

    expect(screen.getByTestId('realtime-status')).toHaveTextContent('Live updates: connecting');
  });

  // "Connecting…" for a whole match read as "my scores are not saving". Saving
  // is an ordinary request and does not use this channel.
  it.each(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'])(
    'says updates are off but scores still save (%s)',
    (status) => {
      renderHeader(status);

      const pill = screen.getByTestId('realtime-status');
      expect(pill).toHaveTextContent('Live updates: off');
      expect(pill).toHaveTextContent('your scores still save');
    }
  );

  it('puts the channel note below the score, not above it', () => {
    renderHeader('SUBSCRIBED');

    const position = screen
      .getByTestId('game-wins')
      .compareDocumentPosition(screen.getByTestId('realtime-status'));

    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the view-only badge for someone who cannot score', () => {
    renderHeader('SUBSCRIBED', false);

    expect(screen.getByText('View only')).toBeInTheDocument();
  });
});
