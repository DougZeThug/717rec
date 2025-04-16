
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Users, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useBracketData } from "@/hooks/useBracketData";
import { useTeamData } from "@/hooks/useTeamData";
import BracketCreationDialog from "@/components/playoffs/BracketCreationDialog";
import DivisionBracketsCard from "@/components/playoffs/DivisionBracketsCard";
import EmptyBracketState from "@/components/playoffs/EmptyBracketState";
import BracketDetail from "@/components/playoffs/BracketDetail";
import TeamDivisionDialog from "@/components/playoffs/TeamDivisionDialog";

const Playoffs = () => {
  const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [bracketDialogOpen, setBracketDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: teams, isLoading: teamsLoading } = useTeamData();

  const { data: allBrackets, isLoading: bracketsLoading, refetch: refetchBrackets } = useQuery({
    queryKey: ['brackets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brackets')
        .select('*, divisions(name)');
      
      if (error) throw error;
      
      return data.map(bracket => ({
        id: bracket.id,
        title: bracket.title,
        division: bracket.divisions?.name || 'Unknown',
        format: bracket.format || 'Single Elimination'
      }));
    }
  });
  
  const { data: divisions, isLoading: divisionsLoading } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*');
      
      if (error) throw error;
      
      return data.map(div => ({
        id: div.id,
        name: div.name
      }));
    }
  });
  
  const { bracket, isLoading: bracketLoading } = useBracketData(selectedBracketId || undefined);

  const teamsByDivision = useMemo(() => {
    if (!teams) return {};
    
    const grouped = teams.reduce((acc, team) => {
      const division = team.divisionName || "Unassigned";
      if (!acc[division]) {
        acc[division] = [];
      }
      acc[division].push(team);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.keys(grouped).forEach(division => {
      grouped[division].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return grouped;
  }, [teams]);

  const bracketsByDivision = useMemo(() => {
    if (!allBrackets || !divisions) return {};
    
    return (divisions || []).reduce((acc, division) => {
      acc[division.name] = (allBrackets || []).filter(bracket => bracket.division === division.name);
      return acc;
    }, {} as Record<string, any[]>);
  }, [allBrackets, divisions]);

  const handleCreateBracket = () => {
    setBracketDialogOpen(true);
  };
  
  const handleBracketCreated = () => {
    refetchBrackets();
  };
  
  const handleEditMatch = (matchId: string) => {
    toast({
      title: "Coming Soon",
      description: `Match editing functionality will be available soon. (Match ID: ${matchId})`,
    });
  };

  const handleTeamDivisionChange = async (teamId: string, newDivisionName: string) => {
    try {
      const { data: divisionData } = await supabase
        .from('divisions')
        .select('id')
        .eq('name', newDivisionName)
        .single();
      
      if (!divisionData) {
        throw new Error('Division not found');
      }
      
      const { error } = await supabase
        .from('teams')
        .update({ division_id: divisionData.id })
        .eq('id', teamId);
        
      if (error) throw error;
      
      toast({
        title: "Division Updated",
        description: `Team division has been updated to ${newDivisionName}.`,
      });
    } catch (error) {
      console.error('Error updating team division:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the team division.",
        variant: "destructive",
      });
    }
  };

  const isLoading = bracketsLoading || divisionsLoading || teamsLoading || bracketLoading;
  
  if (isLoading && !allBrackets && !divisions && !teams) {
    return (
      <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-cornhole-navy animate-spin mb-2" />
          <p>Loading tournament data...</p>
        </div>
      </div>
    );
  }

  const availableDivisions = divisions?.map(div => div.name) || [];
  const allBracketsData = allBrackets || [];

  return (
    <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-cornhole-navy mb-4 md:mb-0">Playoffs</h1>
          
          <div className="flex space-x-3">
            <Button 
              onClick={() => setTeamDialogOpen(true)}
              variant="outline"
              className="border-cornhole-navy text-cornhole-navy hover:bg-cornhole-navy hover:text-white"
            >
              <Users className="h-4 w-4 mr-2" /> Manage Team Divisions
            </Button>
            
            <Button 
              onClick={handleCreateBracket}
              className="bg-cornhole-green hover:bg-cornhole-green/90"
            >
              <Plus className="h-4 w-4 mr-2" /> New Bracket
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {availableDivisions.map((division) => (
            <DivisionBracketsCard 
              key={division}
              division={division}
              brackets={bracketsByDivision[division] || []}
              onCreateBracket={handleCreateBracket}
              onViewBracket={setSelectedBracketId}
            />
          ))}
        </div>
        
        {selectedBracketId && bracket && (
          <BracketDetail 
            bracketId={selectedBracketId}
            bracket={bracket}
            teams={teams || []}
            bracketLoading={bracketLoading}
            onEditBracket={handleCreateBracket}
            onEditMatch={handleEditMatch}
          />
        )}
        
        {allBracketsData.length === 0 && !isLoading && (
          <EmptyBracketState onCreateBracket={handleCreateBracket} />
        )}
      </div>

      {/* Team Division Dialog */}
      <TeamDivisionDialog 
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        teamsByDivision={teamsByDivision}
        availableDivisions={availableDivisions}
        teamsLoading={teamsLoading}
        onTeamDivisionChange={handleTeamDivisionChange}
      />

      {/* Bracket Creation Dialog */}
      <BracketCreationDialog
        open={bracketDialogOpen}
        onOpenChange={setBracketDialogOpen}
        divisions={divisions || []}
        teams={teams || []}
        onBracketCreated={handleBracketCreated}
      />
    </div>
  );
};

export default Playoffs;
