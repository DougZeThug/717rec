
import React, { useState } from "react";
import { 
  Card,
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trophy } from "lucide-react";
import { mockPlayoffBracket, mockTeams } from "@/data/mockData";
import BracketView from "@/components/playoffs/BracketView";
import { PlayoffBracket, Team } from "@/types";
import { useToast } from "@/components/ui/use-toast";

// Placeholder for future features
const currentBrackets = [mockPlayoffBracket];
const divisions = ["Recreational", "Intermediate", "Competitive"];

const Playoffs = () => {
  const [brackets] = useState<PlayoffBracket[]>(currentBrackets);
  const [teams] = useState<Team[]>(mockTeams);
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-cornhole-navy mb-4 md:mb-0">Playoffs</h1>
          
          <Button 
            onClick={handleCreateBracket}
            className="bg-cornhole-green hover:bg-cornhole-green/90"
          >
            <Plus className="h-4 w-4 mr-2" /> New Bracket
          </Button>
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
                        <span>{bracket.name}</span>
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
              <CardTitle>{bracket.name}</CardTitle>
              <CardDescription>{bracket.division} Division</CardDescription>
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
    </div>
  );
};

export default Playoffs;
