
import React from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { imageErrorLog } from "@/utils/logger";

export interface TeamLogoProps {
  imageUrl: string | null | undefined;
  teamName: string;
  teamId?: string;
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  clickable?: boolean;
  className?: string;
  fallbackText?: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ 
  imageUrl, 
  teamName,
  teamId,
  size = 'md',
  rounded = false,
  clickable = false,
  className,
  fallbackText,
}) => {
  const sizeClasses = {
    sm: "w-8 h-8 min-w-8 min-h-8",
    md: "w-10 h-10 min-w-10 min-h-10",
    lg: "w-36 h-36 min-w-36 min-h-36"
  };

  const containerClasses = cn(
    "flex items-center justify-center bg-gray-100 dark:bg-gray-800",
    rounded && "rounded-full overflow-hidden",
    sizeClasses[size],
    className
  );

  const logoContent = (
    <div 
      className={containerClasses}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `View ${teamName} details` : undefined}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={teamName}
          className={cn(
            "object-contain",
            sizeClasses[size],
            rounded ? "rounded-full" : "rounded-none"
          )}
          onError={(e) => {
            imageErrorLog(teamName, imageUrl);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className={cn(
          "flex items-center justify-center text-gray-400 dark:text-gray-600",
          sizeClasses[size]
        )}>
          <span className="text-xs">
            {fallbackText || teamName.substring(0, 2)}
          </span>
        </div>
      )}
    </div>
  );

  if (clickable && teamId) {
    return (
      <Link to={`/teams/${teamId}`} className={cn("block", sizeClasses[size])}>
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
