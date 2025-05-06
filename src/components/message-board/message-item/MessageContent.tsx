
import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface MessageContentProps {
  content: string;
  isEdited?: boolean;
  updatedAt?: string;
}

const MessageContent: React.FC<MessageContentProps> = ({ 
  content, 
  isEdited,
  updatedAt
}) => {
  const formattedText = content.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i < content.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <div className="text-sm mt-1">
      <p className="whitespace-pre-wrap break-words">{formattedText}</p>
      
      {isEdited && updatedAt && (
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span className={cn(
                "text-xs text-muted-foreground inline-block mt-1",
                "cursor-default"
              )}>
                (edited)
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Edited {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default MessageContent;
