
import React, { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTeamData } from "@/hooks/useTeamData";
import { useToast } from "@/hooks/use-toast";
import { Match } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import BatchMatchForm from "./BatchMatchForm";

const MatchesTab = () => {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const teamQuery = useTeamData();
  const teams = teamQuery.data || [];
  const isLoadingTeams = teamQuery.isLoading;

  const handleMatchSubmit = async (matches: any[]) => {
    try {
      const matchesToCreate = matches.map(match => ({
        team1_id: match.team1Id,
        team2_id: match.team2Id,
        date: match.date?.toISOString(),
        location: `Court ${matches.indexOf(match) + 1}`,
        iscompleted: false,
        round_number: 0,
        team1_score: 0,
        team2_score: 0,
      }));

      const { error } = await supabase
        .from('matches')
        .insert(matchesToCreate);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Created ${matches.length} matches successfully.`,
      });

      setIsFormOpen(false);
    } catch (error: any) {
      console.error("Error creating matches:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Match Management</CardTitle>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-cornhole-navy hover:bg-cornhole-navy/90"
        >
          Create Matches
        </Button>
      </CardHeader>
      <CardContent>
        {isLoadingTeams ? (
          <p>Loading teams...</p>
        ) : (
          <div className="space-y-4">
            {isFormOpen && (
              <BatchMatchForm
                teams={teams}
                onSubmit={handleMatchSubmit}
                onCancel={() => setIsFormOpen(false)}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchesTab;
