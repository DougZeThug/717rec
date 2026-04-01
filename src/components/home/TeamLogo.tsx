import React from 'react';

import { FALLBACK_TEAM_IMAGE } from '@/constants/images';
import { imageErrorLog } from '@/utils/logger';

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
            imageErrorLog(teamName, imageUrl);
            (e.target as HTMLImageElement).src = FALLBACK_TEAM_IMAGE;
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
