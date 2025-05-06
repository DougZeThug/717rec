
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageItem from "./MessageItem";
import { Message } from "@/hooks/useMessageBoard";
import { Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MessageFeedProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
}

const MessageFeed: React.FC<MessageFeedProps> = ({ messages, isLoading, error, onDeleteMessage }) => {
  if (isLoading) {
    return (
      <Card className="mb-4 bg-card/50">
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="mb-4 bg-card/50">
        <CardContent className="text-center py-10 text-destructive">
          {error}
        </CardContent>
      </Card>
    );
  }
  
  if (messages.length === 0) {
    return (
      <Card className="mb-4 bg-card/50">
        <CardContent className="flex flex-col justify-center items-center py-10 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
          <p>No messages yet. Be the first to post!</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-4">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-250px)] p-4">
          <div className="space-y-3 pb-4">
            {messages.map((message) => (
              <MessageItem 
                key={message.id} 
                message={message} 
                onDelete={onDeleteMessage}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MessageFeed;
