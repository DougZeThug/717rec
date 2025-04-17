
import React, { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MatchFormDialog from "@/components/schedule/MatchFormDialog";
import { useTeamData } from "@/hooks/useTeamData";
import { useToast } from "@/hooks/use-toast";
import { Match } from "@/types";

const MatchesTab = () => {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const teamQuery = useTeamData();
  const teams = teamQuery.data || [];
  const isLoadingTeams = teamQuery.isLoading;

  const handleMatchSubmit = async (matchData: Omit<Match, "id">) => {
    // Here you would typically save the match to your backend
    console.log("Match data to save:", matchData);
    
    // Show success message
    toast({
      title: "Match Created",
      description: "New match has been successfully scheduled.",
    });
    
    // Close the form dialog
    setIsFormOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Match Management</CardTitle>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-cornhole-navy hover:bg-cornhole-navy/90"
        >
          Create New Match
        </Button>
      </CardHeader>
      <CardContent>
        {isLoadingTeams ? (
          <p>Loading teams...</p>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Use the button above to create new matches. Matches will appear in the schedule 
              once created.
            </p>
            
            <MatchFormDialog
              isOpen={isFormOpen}
              onClose={() => setIsFormOpen(false)}
              teams={teams}
              onSubmit={handleMatchSubmit}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchesTab;
