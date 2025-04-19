
import React from "react";

interface TeamLogoProps {
  imageUrl: string | null | undefined;
  teamName: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ imageUrl, teamName }) => {
  console.log(`TeamLogo component for ${teamName}:`, imageUrl);

  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={teamName}
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error(`Image load error for ${teamName}:`, imageUrl);
            (e.target as HTMLImageElement).style.display = 'none'; // Hide broken image
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
          No Logo
        </div>
      )}
    </div>
  );
};
