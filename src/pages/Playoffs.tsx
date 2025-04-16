
import React, { useState, useMemo } from "react";
import { 
  Card,
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trophy, Users, Edit, Loader2 } from "lucide-react";
import BracketView from "@/components/playoffs/BracketView";
import BracketCreationDialog from "@/components/playoffs/BracketCreationDialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useBracketData } from "@/hooks/useBracketData";
import { useTeamData } from "@/hooks/useTeamData";

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
          {availableDivisions.map((division) => {
            const divisionBrackets = bracketsByDivision[division] || [];
            
            return (
              <Card key={division}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    <Trophy className="h-5 w-5 mr-2 text-cornhole-wood" />
                    {division} Division
                  </CardTitle>
                  <CardDescription>
                    {divisionBrackets.length 
                      ? `${divisionBrackets.length} active bracket${divisionBrackets.length > 1 ? 's' : ''}`
                      : "No active brackets"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {divisionBrackets.length > 0 ? (
                    divisionBrackets.map(bracket => (
                      <div key={bracket.id} className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span>{bracket.title}</span>
                          <span className="text-xs text-gray-500">{bracket.format}</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setSelectedBracketId(bracket.id)}
                        >
                          View
                        </Button>
                      </div>
                    ))
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" onClick={handleCreateBracket}>
                      <Plus className="h-4 w-4 mr-1" /> Create Bracket
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {selectedBracketId && bracket && (
          <Card className="mb-8" id={`bracket-${selectedBracketId}`}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{bracket.name}</CardTitle>
                  <CardDescription>
                    {bracket.division} Division • {bracket.format}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="hidden md:flex" onClick={handleCreateBracket}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Bracket
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {bracketLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-cornhole-navy" />
                </div>
              ) : (
                <BracketView 
                  bracket={bracket}
                  teams={teams || []}
                  onEditMatch={handleEditMatch}
                />
              )}
              
              {bracket.champion && (
                <div className="mt-8 text-center">
                  <div className="text-xl font-bold text-cornhole-navy mb-2">Champion</div>
                  <div className="inline-flex items-center bg-cornhole-cream rounded-full px-6 py-3">
                    <Trophy className="h-6 w-6 mr-2 text-cornhole-wood" />
                    <span className="text-lg font-bold">
                      {teams?.find(t => t.id === bracket.champion)?.name || "Unknown Team"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {allBracketsData.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <Trophy className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-500 mb-2">No Playoff Brackets</h3>
            <p className="text-gray-500 mb-4">
              Create playoff brackets to organize your tournament.
            </p>
            <Button onClick={handleCreateBracket}>
              <Plus className="h-4 w-4 mr-2" /> Create First Bracket
            </Button>
          </div>
        )}
      </div>

      {/* Team Division Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Team Divisions</DialogTitle>
            <DialogDescription>
              Assign teams to different divisions for playoff organization.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {teamsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-cornhole-navy" />
              </div>
            ) : (
              <div className="space-y-6">
                {availableDivisions.map(division => (
                  <div key={division} className="space-y-3">
                    <h3 className="text-lg font-semibold">{division} Division</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {teamsByDivision[division]?.map(team => (
                        <Card key={team.id} className="bg-gray-50">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 mr-2">
                                  {team.logoUrl ? (
                                    <img 
                                      src={team.logoUrl} 
                                      alt={team.name} 
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 text-xs">No Logo</div>
                                  )}
                                </div>
                                <span className="truncate max-w-[120px]" title={team.name}>{team.name}</span>
                              </div>
                              <Select
                                value={team.divisionName || "Unassigned"}
                                onValueChange={(value) => handleTeamDivisionChange(team.id!, value)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Division..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableDivisions.map(d => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                  ))}
                                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}

                {teamsByDivision["Unassigned"]?.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Unassigned Teams</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {teamsByDivision["Unassigned"]?.map(team => (
                        <Card key={team.id} className="bg-gray-50">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 mr-2">
                                  {team.logoUrl ? (
                                    <img 
                                      src={team.logoUrl} 
                                      alt={team.name} 
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 text-xs">No Logo</div>
                                  )}
                                </div>
                                <span className="truncate max-w-[120px]" title={team.name}>{team.name}</span>
                              </div>
                              <Select
                                value={team.divisionName || "Unassigned"}
                                onValueChange={(value) => handleTeamDivisionChange(team.id!, value)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Division..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableDivisions.map(d => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                  ))}
                                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => setTeamDialogOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

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
