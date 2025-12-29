
import React from "react";

interface TeamLogoProps {
  imageUrl: string | undefined | null;
  teamName: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ imageUrl, teamName }) => {
  return (
    <div className="h-full w-full flex items-center justify-center">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={teamName}
          width={144}
          height={144}
          loading="lazy"
          decoding="async"
          className="max-h-36 max-w-full object-contain"
          onError={(e) => {
            console.error(`Image load error for ${teamName}:`, imageUrl);
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=300&fit=crop';
          }}
        />
      ) : (
        <div className="text-gray-400 text-center">
          <span>No Logo Available</span>
        </div>
      )}
    </div>
  );
};
