
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PlayerChipProps {
  playerName: string;
  avatarUrl?: string;
  className?: string;
}

export const PlayerChip: React.FC<PlayerChipProps> = ({
  playerName,
  avatarUrl,
  className = "",
}) => {
  // Get first letter of first and last name for avatar
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (name[0] || "?").toUpperCase();
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 
        text-gray-800 dark:text-gray-200 text-xs hover:bg-gray-200 dark:hover:bg-gray-700 
        transition-all hover:scale-105 cursor-default ${className}`}
    >
      <Avatar className="h-4 w-4">
        {avatarUrl && <img src={avatarUrl} alt={playerName} loading="lazy" decoding="async" />}
        <AvatarFallback className="text-[8px] bg-gray-300 dark:bg-gray-700">
          {getInitials(playerName)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate max-w-[80px]" title={playerName}>{playerName}</span>
    </div>
  );
};
