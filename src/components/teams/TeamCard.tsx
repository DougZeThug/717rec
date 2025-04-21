
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Trophy, X, ExternalLink, BarChart } from "lucide-react";
import { Team } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getCardInteractionStyles } from "@/styles/interactionUtils";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { PowerScoreTooltip } from "@/components/shared/PowerScoreTooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface TeamCardProps {
  team: Team;
  onDelete: (id: string) => void;
  onEdit: (team: Team) => void;
  viewMode: 'grid' | 'list';
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onDelete, onEdit, viewMode }) => {
  const divisionName = team.divisionName || "";
  
  const getDivisionColor = () => {
    if (!divisionName) return "gray";
    
    const lowerDivName = divisionName.toLowerCase();
    if (lowerDivName.includes("competitive")) return "red-500";
    if (lowerDivName.includes("intermediate")) return "blue-500";
    if (lowerDivName.includes("recreational")) return "green-500";
    return "gray-400";
  };

  const divisionColor = getDivisionColor();

  const teamImage = team.imageUrl || team.logoUrl;
  
  const powerScoreColor = getPowerScoreColor(team.power_score);

  const isListView = viewMode === 'list';

  if (isListView) {
    return (
      <Card className="bg-[#1E1E1E] text-white rounded-xl shadow-md overflow-hidden h-full mb-4">
        <div className="flex flex-col md:flex-row h-full">
          {/* Team Logo Section */}
          <div className="w-full md:w-[150px] h-[150px] md:h-auto flex items-center justify-center p-6 bg-black/30">
            {!teamImage ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No Team Image
              </div>
            ) : (
              <img 
                src={teamImage} 
                alt={team.name} 
                className="max-h-28 max-w-full object-contain"
                onError={(e) => {
                  console.error(`Image load error for ${team.name}:`, teamImage);
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=300&fit=crop';
                }}
              />
            )}
          </div>

          {/* Team Info Section */}
          <div className="flex flex-col flex-grow p-4">
            <div className="flex justify-between items-start mb-2">
              <Link to={`/teams/${team.id}`} className="hover:underline">
                <h3 className="text-xl font-bold text-white">{team.name}</h3>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white hover:bg-white/10">
                    <MoreHorizontal size={18} />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(team)} className="cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(team.id)} className="text-destructive focus:text-destructive cursor-pointer">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/teams/${team.id}`}>
                      <ExternalLink className="mr-2 h-4 w-4" /> View Details
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {divisionName && (
              <Badge 
                variant={divisionName.toLowerCase().includes("competitive") ? "competitive" : 
                  divisionName.toLowerCase().includes("intermediate") ? "intermediate" : "recreational"}
                className="mb-3 self-start"
              >
                {divisionName}
              </Badge>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-sm">
              <div className="bg-black/20 p-2 rounded">
                <div className="text-gray-400 text-xs">Record</div>
                <div className="font-medium flex items-center gap-1">
                  <Trophy size={12} className="text-emerald-400" /> {team.wins || 0}
                  <span className="mx-1">-</span>
                  <X size={12} className="text-rose-400" /> {team.losses || 0}
                </div>
              </div>
              
              <div className="bg-black/20 p-2 rounded">
                <div className="text-gray-400 text-xs">Games</div>
                <div className="font-medium">{team.game_wins ?? 0} - {team.game_losses ?? 0}</div>
              </div>
              
              <div className="bg-black/20 p-2 rounded">
                <div className="text-gray-400 text-xs flex items-center gap-1">
                  Power Score <PowerScoreTooltip />
                </div>
                <div className={`font-medium ${powerScoreColor}`}>
                  {formatPowerScore(team.power_score)}
                </div>
              </div>
              
              <div className="bg-black/20 p-2 rounded">
                <div className="text-gray-400 text-xs">SOS</div>
                <div className="font-medium">{team.sos?.toFixed(3) || '0.000'}</div>
              </div>
            </div>
            
            <div className="text-xs text-gray-300 mt-auto">
              <span className="font-medium">Players:</span> 
              <span className="ml-1 text-gray-400">
                {team.players.length > 0
                  ? team.players.slice(0, 4).join(', ') 
                    + (team.players.length > 4 ? ` +${team.players.length - 4} more` : '')
                  : "No players"
                }
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Grid View
  return (
    <Card className="bg-[#1E1E1E] text-white rounded-xl shadow-md overflow-hidden h-full flex flex-col mb-4 sm:mb-0">
      <Link to={`/teams/${team.id}`} className="block">
        <div className="h-24 bg-black/30 flex items-center justify-center p-3">
          {!teamImage ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
              No Team Image
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={teamImage} 
                alt={team.name} 
                className="max-h-20 max-w-full object-contain"
                onError={(e) => {
                  console.error(`Image load error for ${team.name}:`, teamImage);
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=300&fit=crop';
                }}
              />
            </div>
          )}
        </div>
      </Link>
      
      <CardHeader className="pb-2 pt-3 space-y-1">
        <div className="flex justify-between items-start">
          <Link to={`/teams/${team.id}`} className="hover:underline">
            <CardTitle className="text-base truncate pr-2 font-bold text-white" title={team.name}>{team.name}</CardTitle>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:text-white hover:bg-white/10">
                <MoreHorizontal size={15} />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(team)} className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(team.id)} className="text-destructive focus:text-destructive cursor-pointer">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/teams/${team.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" /> View Details
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {divisionName && (
          <Badge 
            variant={divisionName.toLowerCase().includes("competitive") ? "competitive" : 
              divisionName.toLowerCase().includes("intermediate") ? "intermediate" : "recreational"}
            className="self-start"
          >
            {divisionName}
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="flex-grow py-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-black/20 p-1.5 rounded">
            <div className="text-gray-400 text-[10px]">Record</div>
            <div className="font-medium">{team.wins}-{team.losses}</div>
          </div>
          
          <div className="bg-black/20 p-1.5 rounded">
            <div className="text-gray-400 text-[10px]">Power Score</div>
            <div className={`font-medium ${powerScoreColor}`}>
              {formatPowerScore(team.power_score)}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 pb-3">
        <div className="text-[10px] text-gray-400 w-full truncate">
          {team.players.length > 0
            ? team.players.slice(0, 2).join(', ') 
              + (team.players.length > 2 ? ` +${team.players.length - 2}` : '')
            : "No players"
          }
        </div>
      </CardFooter>
    </Card>
  );
};

export default TeamCard;
