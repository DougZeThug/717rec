import React from 'react';

import { imageErrorLog } from '@/utils/logger';

interface TeamImageProps {
  imageUrl: string | null | undefined;
  teamName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export const TeamImage: React.FC<TeamImageProps> = ({
  imageUrl,
  teamName,
  className = '',
  size = 'md',
  onError,
}) => {
  const sizeClasses = {
    sm: 'max-h-20',
    md: 'max-h-28',
    lg: 'max-h-36',
  };

  const defaultOnError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    imageErrorLog(teamName, imageUrl);
    (e.target as HTMLImageElement).style.display = 'none';
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      {!imageUrl ? (
        <div className="flex items-center justify-center h-full text-gray-400 text-xs">
          No Team Image
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={teamName}
          width={size === 'sm' ? 80 : size === 'md' ? 112 : 144}
          height={size === 'sm' ? 80 : size === 'md' ? 112 : 144}
          loading="lazy"
          decoding="async"
          className={`max-w-full object-contain ${sizeClasses[size]} ${className}`}
          onError={onError || defaultOnError}
        />
      )}
    </div>
  );
};
