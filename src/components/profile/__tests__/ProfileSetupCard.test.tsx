import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/profile/ProfileForm', () => ({
  default: ({
    initialUsername,
    initialFullName,
  }: {
    initialUsername: string;
    initialFullName: string;
  }) => <div data-testid="profile-form">{`${initialUsername}|${initialFullName}`}</div>,
}));

vi.mock('@/components/teams/TeamMembershipSection', () => ({
  default: () => <div data-testid="team-membership" />,
}));

import ProfileSetupCard from '../ProfileSetupCard';

const renderCard = (showTeamMembership: boolean) =>
  render(
    <ProfileSetupCard
      initialUsername="Bob"
      initialFullName="Bob Smith"
      onProfileUpdated={vi.fn()}
      showTeamMembership={showTeamMembership}
    />
  );

describe('ProfileSetupCard', () => {
  it('shows the page heading and the form with the saved names', () => {
    renderCard(true);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Set Up Your Profile' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('profile-form')).toHaveTextContent('Bob|Bob Smith');
  });

  it('shows team membership only for a signed-in user', () => {
    const { unmount } = renderCard(true);
    expect(screen.getByTestId('team-membership')).toBeInTheDocument();
    unmount();

    renderCard(false);
    expect(screen.queryByTestId('team-membership')).not.toBeInTheDocument();
  });
});
