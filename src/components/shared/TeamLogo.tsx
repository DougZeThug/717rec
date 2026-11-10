import React from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';
import { imageErrorLog } from '@/utils/logger';
import { toTeamSlug } from '@/utils/teamSlug';

export interface TeamLogoProps {
  imageUrl: string | null | undefined;
  teamName: string;
  teamId?: string;
  /** `fill` takes the size of the box it sits in (a fixed-size preview), instead of a size of its own. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'fill';
  rounded?: boolean;
  clickable?: boolean;
  className?: string;
  fallbackText?: string;
  /**
   * Hide the logo from screen readers. Use it inside a link or row that already
   * shows the team name as text, so the name is read once, not twice.
   */
  decorative?: boolean;
}

const sizeClasses = {
  xs: 'size-5 min-w-5 min-h-5',
  sm: 'size-8 min-w-8 min-h-8',
  md: 'size-10 min-w-10 min-h-10',
  lg: 'size-36 min-w-36 min-h-36',
  fill: 'size-full min-w-0 min-h-0',
};

export const TeamLogo: React.FC<TeamLogoProps> = ({
  imageUrl,
  teamName,
  teamId,
  size = 'md',
  rounded = false,
  clickable = false,
  className,
  fallbackText,
  decorative = false,
}) => {
  const containerClasses = cn(
    'flex items-center justify-center bg-muted',
    rounded && 'rounded-full overflow-hidden',
    sizeClasses[size],
    className
  );

  const logoContent = (
    <div className={containerClasses} aria-hidden={decorative || undefined}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={teamName}
          className={cn(
            'object-contain',
            sizeClasses[size],
            rounded ? 'rounded-full' : 'rounded-none'
          )}
          onError={(e) => {
            imageErrorLog(teamName, imageUrl);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center text-muted-foreground',
            sizeClasses[size]
          )}
        >
          <span className="text-xs">{fallbackText || teamName.substring(0, 2)}</span>
        </div>
      )}
    </div>
  );

  if (clickable && teamId) {
    return (
      <Link to={`/teams/${toTeamSlug(teamName)}`} className={cn('block', sizeClasses[size])}>
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
