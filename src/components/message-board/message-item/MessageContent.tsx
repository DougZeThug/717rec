import { useTheme } from 'next-themes';
import React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceFrom } from '@/utils/formatDateSafe';

interface MessageContentProps {
  content: string;
  isEdited?: boolean;
  updatedAt?: string;
}

const MessageContent: React.FC<MessageContentProps> = ({ content, isEdited, updatedAt }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const lines = content.split('\n');
  const formattedText = lines.map((line, i) => {
    // Lines have no inherent identity; disambiguate identical lines by
    // counting prior occurrences so React keys stay stable without using
    // the raw array index.
    const occurrence = lines.slice(0, i).filter((l) => l === line).length;
    const key = JSON.stringify(['line', line, occurrence]);
    return (
      <React.Fragment key={key}>
        {line}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });

  return (
    <div className="text-sm mt-1">
      <p className="whitespace-pre-wrap break-words">{formattedText}</p>

      {isEdited && updatedAt && (
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'text-xs inline-block mt-1 cursor-default',
                  isDark ? 'text-gray-400' : 'text-muted-foreground'
                )}
              >
                (edited)
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Edited {formatDistanceFrom(updatedAt, { addSuffix: true })}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default MessageContent;
