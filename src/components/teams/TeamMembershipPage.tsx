
import React from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import TeamMembershipSection from "./TeamMembershipSection";
import TeamEditSection from "./TeamEditSection";

const TeamMembershipPage: React.FC = () => {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Team</h1>
            <p className="text-muted-foreground">
              Manage your team membership and edit team details
            </p>
          </div>
          
          <TeamMembershipSection />
          <TeamEditSection />
        </div>
      </div>
    </PageLayout>
  );
};

export default TeamMembershipPage;
