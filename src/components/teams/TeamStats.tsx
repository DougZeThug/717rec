
import { Team } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TeamStatsProps {
  team: Team;
  winPercentage: string;
}

const TeamStats = ({ team, winPercentage }: TeamStatsProps) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Team Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">{team.wins}</div>
            <div className="text-sm text-gray-500">Wins</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">{team.losses}</div>
            <div className="text-sm text-gray-500">Losses</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">{winPercentage}%</div>
            <div className="text-sm text-gray-500">Win Percentage</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">TBD</div>
            <div className="text-sm text-gray-500">Strength of Schedule</div>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Players</h3>
          <div className="flex flex-wrap gap-2">
            {team.players && team.players.length > 0 ? (
              team.players.map((player, index) => (
                <Badge key={index} variant="secondary">
                  {player.name}
                </Badge>
              ))
            ) : (
              <span className="text-gray-500">No players listed</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamStats;
