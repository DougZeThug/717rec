
import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface MessageContentProps {
  content: string;
  maxLength?: number;
}

const MessageContent: React.FC<MessageContentProps> = ({ 
  content,
  maxLength = 280
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Check if message is long and needs expansion/collapsing
  const isLongMessage = content.length > maxLength;
  const displayedContent = isLongMessage && !expanded 
    ? content.slice(0, maxLength) + '...'
    : content;
    
  return (
    <>
      <div className="break-words whitespace-pre-wrap text-foreground text-sm leading-relaxed">
        {displayedContent}
      </div>
      
      {/* Expand/Collapse Button for long messages */}
      {isLongMessage && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mt-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>Read more</span>
            </>
          )}
        </button>
      )}
    </>
  );
};

export default MessageContent;
