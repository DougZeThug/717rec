
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import MatchForm from "@/components/schedule/MatchForm";
import { useTeamData } from "@/hooks/useTeamData";
import { useToast } from "@/hooks/use-toast";

const MatchesTab = () => {
  const { toast } = useToast();
  const teamQuery = useTeamData();
  const teams = teamQuery.data || [];
  const isLoadingTeams = teamQuery.isLoading;

  const handleMatchSubmit = async (matchData: any) => {
    toast({
      title: "Match Created",
      description: "New match has been scheduled.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Match</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingTeams ? (
          <p>Loading teams...</p>
        ) : (
          <MatchForm 
            teams={teams}
            onSubmit={handleMatchSubmit}
            onCancel={() => {}}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default MatchesTab;
