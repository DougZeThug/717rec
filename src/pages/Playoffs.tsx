
import React, { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trophy, Users, Edit } from "lucide-react";
import { 
  mockPlayoffBracket, 
  mockTeams, 
  mockIntermediatePlayoffBracket, 
  mockCompetitivePlayoffBracket 
} from "@/data/mockData";
import BracketView from "@/components/playoffs/BracketView";
import { PlayoffBracket, Team } from "@/types";
import { useToast } from "@/components/ui/use-toast";

// Placeholder for future features
const currentBrackets = [mockPlayoffBracket, mockIntermediatePlayoffBracket, mockCompetitivePlayoffBracket];
const divisions = ["Recreational", "Intermediate", "Competitive"];

const Playoffs = () => {
  const [brackets, setBrackets] = useState<PlayoffBracket[]>(currentBrackets);
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const { toast } = useToast();

  // Group teams by division
  const teamsByDivision = teams.reduce((acc, team) => {
    const division = team.division || "Unassigned";
    if (!acc[division]) {
      acc[division] = [];
    }
    acc[division].push(team);
    return acc;
  }, {} as Record<string, Team[]>);

  const handleCreateBracket = () => {
    // This would open a dialog in a real implementation
    toast({
      title: "Coming Soon",
      description: "Bracket creation functionality will be available soon.",
    });
  };
  
  const handleEditMatch = (matchId: string) => {
    // This would open a dialog to edit the match in a real implementation
    toast({
      title: "Coming Soon",
      description: `Match editing functionality will be available soon. (Match ID: ${matchId})`,
    });
  };

  const handleTeamDivisionChange = (teamId: string, newDivision: string) => {
    const updatedTeams = teams.map(team => 
      team.id === teamId ? { ...team, division: newDivision } : team
    );
    setTeams(updatedTeams);
    
    toast({
      title: "Division Updated",
      description: `Team division has been updated to ${newDivision}.`,
    });
  };

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
          {divisions.map((division) => {
            const divisionBrackets = brackets.filter(b => b.division === division);
            
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
                          <span>{bracket.name}</span>
                          <span className="text-xs text-gray-500">{bracket.format}</span>
                        </div>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={`#bracket-${bracket.id}`}>View</a>
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
        
        {brackets.map((bracket) => (
          <Card key={bracket.id} className="mb-8" id={`bracket-${bracket.id}`}>
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
              <BracketView 
                bracket={bracket} 
                teams={teams}
                onEditMatch={handleEditMatch}
              />
              
              {bracket.champion && (
                <div className="mt-8 text-center">
                  <div className="text-xl font-bold text-cornhole-navy mb-2">Champion</div>
                  <div className="inline-flex items-center bg-cornhole-cream rounded-full px-6 py-3">
                    <Trophy className="h-6 w-6 mr-2 text-cornhole-wood" />
                    <span className="text-lg font-bold">
                      {teams.find(t => t.id === bracket.champion)?.name || "Unknown Team"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {brackets.length === 0 && (
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

      {/* Team Division Management Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Team Divisions</DialogTitle>
            <DialogDescription>
              Assign teams to different divisions for playoff organization.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-6">
              {divisions.map(division => (
                <div key={division} className="space-y-3">
                  <h3 className="text-lg font-semibold">{division} Division</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teamsByDivision[division]?.map(team => (
                      <Card key={team.id} className="bg-gray-50">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                                {team.logoUrl && (
                                  <img 
                                    src={team.logoUrl} 
                                    alt={team.name} 
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <span className="truncate">{team.name}</span>
                            </div>
                            <Select
                              value={team.division || "Unassigned"}
                              onValueChange={(value) => handleTeamDivisionChange(team.id, value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Division..." />
                              </SelectTrigger>
                              <SelectContent>
                                {divisions.map(d => (
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

              {/* Unassigned Teams */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Unassigned Teams</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teamsByDivision["Unassigned"]?.map(team => (
                    <Card key={team.id} className="bg-gray-50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                              {team.logoUrl && (
                                <img 
                                  src={team.logoUrl} 
                                  alt={team.name} 
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <span className="truncate">{team.name}</span>
                          </div>
                          <Select
                            value={team.division || "Unassigned"}
                            onValueChange={(value) => handleTeamDivisionChange(team.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Division..." />
                            </SelectTrigger>
                            <SelectContent>
                              {divisions.map(d => (
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
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => setTeamDialogOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Playoffs;
