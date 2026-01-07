
import React from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { imageErrorLog } from "@/utils/logger";

export interface TeamImageProps {
  imageUrl: string | null | undefined;
  teamName: string;
  teamId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean;
  clickable?: boolean;
  className?: string;
  fallbackText?: string;
  alt?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export const TeamImage: React.FC<TeamImageProps> = ({ 
  imageUrl, 
  teamName,
  teamId,
  size = 'md',
  rounded = false,
  clickable = false,
  className,
  fallbackText,
  alt,
  onError
}) => {
  const sizeClasses = {
    xs: "w-6 h-6 min-w-6 min-h-6",
    sm: "w-8 h-8 min-w-8 min-h-8",
    md: "w-10 h-10 min-w-10 min-h-10",
    lg: "w-16 h-16 min-w-16 min-h-16",
    xl: "w-36 h-36 min-w-36 min-h-36"
  };

  // Touch-friendly size classes for interactive elements
  const touchSizeClasses = {
    xs: "w-10 h-10", // Minimum 40px for touch
    sm: "w-11 h-11", // Slightly larger
    md: "w-12 h-12", // 48px is good for touch targets
    lg: "w-16 h-16",
    xl: "w-36 h-36"
  };

  // Use touch-friendly sizes if clickable, otherwise use standard sizes
  const finalSizeClasses = clickable ? touchSizeClasses[size] : sizeClasses[size];

  const containerClasses = cn(
    "flex items-center justify-center bg-gray-100 dark:bg-gray-800",
    rounded && "rounded-full overflow-hidden",
    finalSizeClasses,
    className
  );

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    imageErrorLog(teamName, imageUrl);
    
    // Make the image invisible
    (e.target as HTMLImageElement).style.display = 'none';
    
    // Call custom error handler if provided
    if (onError) {
      onError(e);
    }
  };

  const logoContent = (
    <div 
      className={containerClasses}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `View ${teamName} details` : undefined}
      style={clickable ? { touchAction: "manipulation" } : undefined}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt || `${teamName} logo`}
          className={cn(
            "object-contain",
            sizeClasses[size],
            rounded ? "rounded-full" : "rounded-none"
          )}
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <div className={cn(
          "flex items-center justify-center text-gray-400 dark:text-gray-600",
          sizeClasses[size]
        )}>
          <span className="text-xs font-medium">
            {fallbackText || teamName.substring(0, 2).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );

  if (clickable && teamId) {
    return (
      <Link 
        to={`/teams/${teamId}`} 
        className={cn(
          "block flex items-center justify-center", 
          touchSizeClasses[size],
          "touch-manipulation"
        )}
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};

export default TeamImage;
