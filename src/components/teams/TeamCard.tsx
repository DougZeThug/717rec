
import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Image } from "lucide-react";
import type { Team } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TeamCardProps {
  team: Team;
  onEdit: (team: Team) => void;
  onDelete: (teamId: string) => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onEdit, onDelete }) => {
  const winPercentage = team.wins + team.losses > 0 
    ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(1) 
    : "0.0";

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="h-48 bg-card relative overflow-hidden flex items-center justify-center">
        {(team.imageUrl || team.logoUrl) ? (
          <img 
            src={team.imageUrl || team.logoUrl} 
            alt={`${team.name} logo`} 
            className="w-full h-full object-contain p-4"
            onError={(e) => {
              // If image fails to load, show first letter instead
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.classList.add('bg-cornhole-navy', 'text-white');
                parent.innerHTML += `<div class="w-full h-full flex items-center justify-center text-4xl font-bold">${team.name.charAt(0)}</div>`;
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
            <div className="flex flex-col items-center justify-center">
              <Image className="h-16 w-16 mb-2 opacity-20" />
              <div className="text-4xl font-bold">{team.name.charAt(0)}</div>
            </div>
          </div>
        )}
      </div>
      <CardContent className="pt-4">
        <h3 className="text-xl font-bold mb-2">{team.name}</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Record:</span>
            <span className="font-medium">{team.wins} - {team.losses}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Win %:</span>
            <span className="font-medium">{winPercentage}%</span>
          </div>
          <div className="mt-3">
            <p className="text-gray-600 mb-1">Players:</p>
            {team.players && team.players.length > 0 ? (
              <ul className="list-disc list-inside">
                {team.players.map((player, index) => (
                  <li key={index} className="truncate">{player.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground italic">No players listed</p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2 pb-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-cornhole-navy border-cornhole-navy hover:bg-cornhole-navy hover:text-white"
          onClick={() => onEdit(team)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="text-destructive border-destructive hover:bg-destructive hover:text-white"
          onClick={() => onDelete(team.id)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TeamCard;
