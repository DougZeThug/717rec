
import React, { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageItem from "./MessageItem";
import { Message } from "@/types/reactions";
import { Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useInView } from "react-intersection-observer";
import { animations, gradients } from "@/styles/designSystem";

interface MessageFeedProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}

const MessageFeed: React.FC<MessageFeedProps> = ({ 
  messages, 
  isLoading, 
  error, 
  onDeleteMessage,
  onEditMessage,
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
      <Card className={cn("mb-4 border shadow", gradients.card.subtle)}>
        <CardContent className="flex justify-center items-center py-12">
          <div className={cn("flex flex-col items-center", animations.pulse)}>
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className={cn("mb-4 border-destructive/50", animations.fadeIn)}>
        <CardContent className="text-center py-12 text-destructive">
          <div className="space-y-2">
            <p className="font-medium">{error}</p>
            <p className="text-sm mt-2 text-muted-foreground">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (messages.length === 0) {
    return (
      <Card className={cn("mb-4 bg-card/50", animations.fadeIn)}>
        <CardContent className="flex flex-col justify-center items-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
          <p className="font-medium">No messages yet</p>
          <p className="text-sm mt-1">Be the first to post!</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("mb-4 border shadow", gradients.card.subtle)}>
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
                onEdit={onEditMessage}
              />
            ))}
            
            {/* Load more messages trigger */}
            {hasMore && (
              <div 
                ref={loadMoreRef} 
                className="py-4 flex justify-center"
                aria-live="polite"
                aria-busy={loadingMore}
              >
                {loadingMore ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading more messages...</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Scroll for more messages</span>
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
