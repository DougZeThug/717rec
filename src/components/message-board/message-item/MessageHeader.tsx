import { Clock, Tag } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import TeamNameDisplay from '../TeamNameDisplay';

interface MessageHeaderProps {
  username: string;
  teamName: string | null;
  /** Short, human label for when the message was posted, e.g. "3 weeks ago". */
  timeString: string;
  /** Full date and time, shown on hover and read out by assistive tech. */
  timeTitle?: string;
  /** Machine-readable timestamp for the <time> element. */
  timeDateTime?: string;
  powerScore?: number;
  isAnnouncement: boolean;
}

const MessageHeader: React.FC<MessageHeaderProps> = ({
  username,
  teamName,
  timeString,
  timeTitle,
  timeDateTime,
  powerScore,
  isAnnouncement,
}) => {
  return (
    <>
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-2 max-w-full">
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div>
                  <TeamNameDisplay
                    username={username}
                    teamName={teamName}
                    powerScore={powerScore}
                    compact={true}
                  />
                </div>
              </TooltipTrigger>
              {powerScore && (
                <TooltipContent side="top" className="px-3 py-1.5">
                  <p className="text-xs font-medium">Team Power Score: {powerScore.toFixed(1)}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <time
            className="text-xs text-muted-foreground flex items-center whitespace-nowrap"
            dateTime={timeDateTime || undefined}
            title={timeTitle || undefined}
            aria-label={timeTitle || undefined}
          >
            <Clock className="size-3 opacity-70 inline mr-0.5" />
            {timeString}
          </time>
        </div>
      </div>

      {/* Message Category - Only show for Announcements */}
      {isAnnouncement && (
        <Badge
          variant="outline"
          className="mb-2 text-xs font-medium px-2 py-0.5 flex items-center gap-0.5 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
        >
          <Tag className="size-3 mr-0.5" />
          Announcement
        </Badge>
      )}
    </>
  );
};

export default MessageHeader;
