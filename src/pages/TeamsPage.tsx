
import React from "react";
import { TeamsHeader } from "@/components/teams/TeamsHeader";
import TeamsContainer from "@/components/teams/TeamsContainer";

const TeamsPage: React.FC = () => {
  return (
    <div className="container px-4 py-6 sm:py-8 mx-auto font-sans">
      <TeamsContainer />
    </div>
  );
};

export default TeamsPage;
