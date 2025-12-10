
import React, { useState } from "react";
import { PlayerChip } from "./shared/PlayerChip";
import { Users, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface PlayerListProps {
  players: string[];
}

const PlayerList = ({ players }: PlayerListProps) => {
  const [isOpen, setIsOpen] = useState(true);
  
  if (!players?.length) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card shadow-sm">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 md:p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
            <h2 className="font-bebas text-lg md:text-xl tracking-wide uppercase bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent">
              Players
            </h2>
          </div>
          <ChevronDown className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 md:p-4 pt-0 border-t">
            <div className="flex flex-wrap gap-2 pt-3">
              {players.map((player, index) => (
                <PlayerChip 
                  key={`${player}-${index}`}
                  playerName={player}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default PlayerList;
