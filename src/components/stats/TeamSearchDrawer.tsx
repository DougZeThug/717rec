import React, { useState, useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Ranking } from "@/types";
import { Search, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";
import { TeamLogo } from "@/components/ui/team";

interface TeamSearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rankings: Ranking[];
  onTeamSelect: (teamId: string) => void;
}

const TeamSearchDrawer: React.FC<TeamSearchDrawerProps> = ({
  open,
  onOpenChange,
  rankings,
  onTeamSelect,
}) => {
  const { isWinterTheme } = useSeasonalTheme();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTeams = useMemo(() => {
    if (!searchTerm.trim()) return rankings;
    const term = searchTerm.toLowerCase();
    return rankings.filter((ranking) =>
      ranking.teamName.toLowerCase().includes(term)
    );
  }, [rankings, searchTerm]);

  const handleTeamClick = (teamId: string) => {
    setSearchTerm("");
    onTeamSelect(teamId);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Your Team
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-2">
          <Input
            placeholder="Search team name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full"
          />
        </div>

        <div className="overflow-y-auto px-4 pb-6 max-h-[60vh]">
          {filteredTeams.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No teams found matching "{searchTerm}"
            </p>
          ) : (
            <div className="space-y-1">
              {filteredTeams.map((ranking, index) => {
                const globalRank = rankings.findIndex(
                  (r) => r.teamId === ranking.teamId
                ) + 1;

                return (
                  <button
                    key={ranking.teamId}
                    onClick={() => handleTeamClick(ranking.teamId)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      "hover:bg-accent/50 active:bg-accent",
                      isWinterTheme
                        ? "border border-frost-border/30"
                        : "border border-border/50"
                    )}
                  >
                    <div className="flex-shrink-0 w-8 h-8">
                      <TeamLogo
                        imageUrl={ranking.logoUrl || ranking.imageUrl}
                        teamName={ranking.teamName}
                        size="sm"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ranking.teamName}</p>
                      <p className="text-xs text-muted-foreground">
                        {ranking.divisionName || "No Division"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-sm">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-medium">#{globalRank}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default TeamSearchDrawer;
