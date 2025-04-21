
import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TeamLogoProps {
  imageUrl: string | null | undefined;
  teamName: string;
  teamId?: string;
  clickable?: boolean;
  className?: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ 
  imageUrl, 
  teamName,
  teamId,
  clickable = false,
  className
}) => {
  const logoContent = (
    <div 
      className={cn(
        "rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800",
        clickable ? "cursor-pointer hover:opacity-80 transition-opacity" : "",
        "w-full h-full",
        className
      )}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `View ${teamName} details` : undefined}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={teamName}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-xs">
          {teamName.substring(0, 2)}
        </div>
      )}
    </div>
  );

  if (clickable && teamId) {
    return (
      <Link to={`/teams/${teamId}`} className="block w-full h-full">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
