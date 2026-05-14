import React from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';
import { toTeamSlug } from '@/utils/teamSlug';

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
  className,
}) => {
  // Remove avatar/circle styling from container
  const logoContent = (
    <div
      className={cn(
        // Remove: 'rounded-full overflow-hidden'
        'bg-gray-100 dark:bg-gray-800 flex items-center justify-center',
        'size-10', // enforce fixed size always for logo
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
          className="size-10 object-contain rounded-none"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="size-10 flex items-center justify-center bg-muted dark:bg-card text-muted-foreground dark:text-gray-600 text-xs">
          {teamName.substring(0, 2)}
        </div>
      )}
    </div>
  );

  if (clickable && teamId) {
    return (
      <Link to={`/teams/${toTeamSlug(teamName)}`} className="block size-10">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
