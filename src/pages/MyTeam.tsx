
import React from "react";
import { useNavigate } from "react-router-dom";
import TeamMembershipSection from "@/components/teams/TeamMembershipSection";
import { useTeamMembership } from "@/hooks/useTeamMembership";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MyTeam: React.FC = () => {
  const { membership, isFetching } = useTeamMembership();
  const navigate = useNavigate();

  // If fetching, show loading state
  if (isFetching) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  // If user has a team, redirect to the team details page
  React.useEffect(() => {
    if (membership?.team_id) {
      navigate(`/teams/${membership.team_id}`);
    }
  }, [membership, navigate]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} className="mr-2" /> Back
      </Button>

      <h1 className="text-2xl font-bold mb-8">My Team</h1>
      
      <div className="max-w-md mx-auto">
        <TeamMembershipSection />
      </div>
    </div>
  );
};

export default MyTeam;
