
import React, { useState } from "react";
import { PlayoffBracket, Team } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import PlayoffMatchList from "./PlayoffMatchList";

interface PlayoffAdminSectionProps {
  bracket: PlayoffBracket;
  teams: Team[];
  onEditMatch: (matchId: string, quickEdit: boolean) => void;
}

const PLAYOFF_ADMIN_TAB_KEY = "playoffAdminActiveTab";

const PlayoffAdminSection: React.FC<PlayoffAdminSectionProps> = ({ 
  bracket,
  teams, 
  onEditMatch
}) => {
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem(PLAYOFF_ADMIN_TAB_KEY) || "matches";
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    sessionStorage.setItem(PLAYOFF_ADMIN_TAB_KEY, tabId);
  };
  
  // Group matches by type for the different tabs
  const winnerMatches = bracket.matches.filter(m => m.matchType === "winners");
  const loserMatches = bracket.matches.filter(m => m.matchType === "losers");
  const finalMatches = bracket.matches.filter(m => m.matchType === "finals");
  const playInMatches = bracket.matches.filter(m => m.matchType === "play-in");
  
  return (
    <Card className="border rounded-lg overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="matches">All Matches</TabsTrigger>
          <TabsTrigger value="winners">Winners Bracket</TabsTrigger>
          <TabsTrigger value="losers">Losers Bracket</TabsTrigger>
          <TabsTrigger value="finals">Finals</TabsTrigger>
        </TabsList>
        
        <TabsContent value="matches">
          <PlayoffMatchList 
            matches={bracket.matches} 
            teams={teams}
            onEditMatch={onEditMatch}
            title={`All Matches - ${bracket.name}`}
          />
        </TabsContent>
        
        <TabsContent value="winners">
          <PlayoffMatchList 
            matches={winnerMatches} 
            teams={teams}
            onEditMatch={onEditMatch}
            title="Winners Bracket"
            matchTypeFilter="winners"
          />
        </TabsContent>
        
        <TabsContent value="losers">
          <PlayoffMatchList 
            matches={loserMatches} 
            teams={teams}
            onEditMatch={onEditMatch}
            title="Losers Bracket"
            matchTypeFilter="losers"
          />
        </TabsContent>
        
        <TabsContent value="finals">
          <PlayoffMatchList 
            matches={[...finalMatches, ...playInMatches]} 
            teams={teams}
            onEditMatch={onEditMatch}
            title="Finals & Play-in Matches"
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default PlayoffAdminSection;
