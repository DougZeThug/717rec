import React from 'react';

import SeoHead from '@/components/seo/SeoHead';
import TeamMembershipPage from '@/components/teams/TeamMembershipPage';

const MyTeam: React.FC = () => (
  <>
    <SeoHead
      title="Manage Your Team | 717REC"
      description="See your 717REC team, request to join a team, and manage your roster membership."
      path="/my-team"
    />
    <TeamMembershipPage />
  </>
);

export default MyTeam;
