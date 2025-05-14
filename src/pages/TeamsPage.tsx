
import React from "react";
import TeamsPageContainer from "@/components/teams/TeamsPageContainer";
import PageLayout from "@/components/layout/PageLayout";

const TeamsPage: React.FC = () => (
  <PageLayout>
    <div className="container mx-auto">
      <TeamsPageContainer />
    </div>
  </PageLayout>
);

export default TeamsPage;
