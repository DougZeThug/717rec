
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageItem from "./MessageItem";
import { Message } from "@/hooks/useMessageBoard";
import { Loader2 } from "lucide-react";

interface MessageFeedProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
}

const MessageFeed: React.FC<MessageFeedProps> = ({ messages, isLoading, error, onDeleteMessage }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-10 text-destructive">
        {error}
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No messages yet. Be the first to post!
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-[calc(100vh-250px)] pr-4">
      <div className="space-y-3 pb-16">
        {messages.map((message) => (
          <MessageItem 
            key={message.id} 
            message={message} 
            onDelete={onDeleteMessage}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default MessageFeed;
