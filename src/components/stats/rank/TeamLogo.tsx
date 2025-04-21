
import React from "react";
import { Link } from "react-router-dom";

interface TeamLogoProps {
  imageUrl: string | null | undefined;
  teamName: string;
  teamId?: string;
  clickable?: boolean;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ 
  imageUrl, 
  teamName,
  teamId,
  clickable = false 
}) => {
  console.log(`TeamLogo component for ${teamName}:`, imageUrl);

  const logoContent = (
    <div 
      className={`w-8 h-8 rounded-full overflow-hidden bg-gray-100 ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `View ${teamName} details` : undefined}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={teamName}
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error(`Image load error for ${teamName}:`, imageUrl);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
          No Logo
        </div>
      )}
    </div>
  );

  if (clickable && teamId) {
    return (
      <Link to={`/teams/${teamId}`}>
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
