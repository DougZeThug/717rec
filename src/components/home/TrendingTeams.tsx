
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import { Team } from "@/types";
import { formatPowerScore } from "@/utils/powerScore";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface TrendingTeamsProps {
  trendingTeams: Array<{
    team: Team;
    increase: number;
  }>;
}

const TrendingTeamCard: React.FC<{
  team: Team;
  increase: number;
}> = ({ team, increase }) => {
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={team.imageUrl || team.logoUrl || ''} alt={team.name} />
            <AvatarFallback>{team.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <h3 className="font-semibold">{team.name}</h3>
            <p className="text-sm text-gray-600">
              {team.wins}-{team.losses} • {formatPowerScore(team.power_score)}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="success" className="flex items-center gap-1 mb-1">
              <ArrowUpRight className="h-3 w-3" />
              <span>On the Rise</span>
            </Badge>
            <p className="text-sm font-semibold text-emerald-600">
              +{increase.toFixed(1)} pts
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TrendingTeams: React.FC<TrendingTeamsProps> = ({ trendingTeams }) => {
  if (!trendingTeams || trendingTeams.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-cornhole-navy">Trending Teams</h2>
          <p className="text-sm text-gray-600 mt-1">
            Teams with the biggest power score increases
          </p>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trendingTeams.slice(0, 3).map((item) => (
            <TrendingTeamCard 
              key={item.team.id} 
              team={item.team} 
              increase={item.increase}
            />
          ))}
        </div>
      </div>

      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            {trendingTeams.slice(0, 5).map((item) => (
              <CarouselItem key={item.team.id} className="basis-full sm:basis-1/2">
                <TrendingTeamCard 
                  team={item.team} 
                  increase={item.increase}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center mt-4">
            <CarouselPrevious className="relative -left-0 top-0 translate-y-0 mr-4" />
            <CarouselNext className="relative -right-0 top-0 translate-y-0" />
          </div>
        </Carousel>
      </div>
    </div>
  );
};

export default TrendingTeams;
