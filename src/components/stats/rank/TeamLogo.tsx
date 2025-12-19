
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
  // Remove avatar/circle styling from container
  const logoContent = (
    <div 
      className={cn(
        // Remove: 'rounded-full overflow-hidden'
        "bg-gray-100 dark:bg-gray-800 flex items-center justify-center",
        "w-10 h-10", // enforce fixed size always for logo
        className
      )}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `View ${teamName} details` : undefined}
      style={{ minWidth: 40, minHeight: 40 }} // ensure square
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={teamName}
          loading="lazy"
          decoding="async"
          className="w-10 h-10 object-contain rounded-none"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-xs">
          {teamName.substring(0, 2)}
        </div>
      )}
    </div>
  );

  if (clickable && teamId) {
    return (
      <Link to={`/teams/${teamId}`} className="block w-10 h-10">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
