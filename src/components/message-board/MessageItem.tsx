
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Message } from "@/hooks/useMessageBoard";
import { formatDistanceToNow } from "date-fns";

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const formattedTime = formatDistanceToNow(new Date(message.created_at), { 
    addSuffix: true,
    includeSeconds: true
  });
  
  return (
    <Card className="mb-3 overflow-hidden">
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div className="font-bold">
            {message.username}
            {message.team_name && (
              <span className="font-normal text-muted-foreground"> ({message.team_name})</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formattedTime}
          </div>
        </div>
        <div className="mt-1 break-words whitespace-pre-wrap">
          {message.content}
        </div>
      </CardContent>
    </Card>
  );
};

export default MessageItem;
