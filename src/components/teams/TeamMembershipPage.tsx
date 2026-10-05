import React from 'react';

import PageHeader from '@/components/layout/PageHeader';
import PageLayout from '@/components/layout/PageLayout';

import TeamEditSection from './TeamEditSection';
import TeamMembershipSection from './TeamMembershipSection';

const TeamMembershipPage: React.FC = () => {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-8">
          <PageHeader
            title="My Team"
            description="Manage your team membership and edit team details"
            className="mb-0"
          />

          <TeamMembershipSection />
          <TeamEditSection />
        </div>
      </div>
    </PageLayout>
  );
};

export default TeamMembershipPage;
