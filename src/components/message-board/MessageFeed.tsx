
import React, { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageItem from "./MessageItem";
import { Message } from "@/hooks/useMessageBoard";
import { Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useInView } from "react-intersection-observer";

interface MessageFeedProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}

const MessageFeed: React.FC<MessageFeedProps> = ({ 
  messages, 
  isLoading, 
  error, 
  onDeleteMessage,
  hasMore,
  onLoadMore,
  loadingMore
}) => {
  // Set up intersection observer for infinite scrolling
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
  });

  // Load more messages when the load more element comes into view
  useEffect(() => {
    if (inView && hasMore && !loadingMore) {
      onLoadMore();
    }
  }, [inView, hasMore, onLoadMore, loadingMore]);

  if (isLoading && messages.length === 0) {
    return (
      <Card className="mb-4 bg-card/50">
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="mb-4 bg-card/50 border-destructive/50">
        <CardContent className="text-center py-12 text-destructive">
          <p className="font-medium">{error}</p>
          <p className="text-sm mt-2 text-muted-foreground">Please try refreshing the page</p>
        </CardContent>
      </Card>
    );
  }
  
  if (messages.length === 0) {
    return (
      <Card className="mb-4 bg-card/50">
        <CardContent className="flex flex-col justify-center items-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
          <p className="font-medium">No messages yet</p>
          <p className="text-sm mt-1">Be the first to post!</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-4 border shadow">
      <CardContent className="p-0">
        <ScrollArea className={cn(
          "h-[calc(100vh-250px)]",
          "lg:h-[calc(100vh-280px)]"
        )}>
          <div className="space-y-2 p-3">
            {messages.map((message) => (
              <MessageItem 
                key={message.id} 
                message={message} 
                onDelete={onDeleteMessage}
              />
            ))}
            
            {/* Load more messages trigger */}
            {hasMore && (
              <div 
                ref={loadMoreRef} 
                className="py-4 flex justify-center"
              >
                {loadingMore ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-sm text-muted-foreground">Loading more messages...</span>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MessageFeed;
