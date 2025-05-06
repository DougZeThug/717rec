
import React, { useRef } from "react";
import PageLayout from "@/components/layout/PageLayout";
import PageTransition from "@/components/transitions/PageTransition";
import { useMessageBoard } from "@/hooks/useMessageBoard";
import { useAuth } from "@/contexts/AuthContext";
import MessageFeed from "@/components/message-board/MessageFeed";
import MessageInput from "@/components/message-board/MessageInput";
import LoginPrompt from "@/components/message-board/LoginPrompt";
import PageHeader from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/designSystem";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const MessageBoard: React.FC = () => {
  const { 
    messages, 
    isLoading, 
    error, 
    postMessage, 
    deleteMessage, 
    hasMore, 
    loadingMore,
    loadMoreMessages,
    refreshMessages 
  } = useMessageBoard();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshMessages();
    setIsRefreshing(false);
  };
  
  return (
    <PageLayout>
      <PageTransition>
        <div className="container max-w-3xl mx-auto px-4 pb-20 md:pb-24">
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pb-4 pt-1">
            <PageHeader 
              title={
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-6 w-6 text-primary" />
                  <span>Message Board</span>
                </div>
              }
              description="Chat with other teams and participants"
              className={cn(animations.fadeInSlideDown, "mb-3")} 
              compact
            />
            
            {/* Refresh Button */}
            <div className="flex justify-end mb-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
                className="text-xs flex items-center gap-1"
              >
                <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
          
          <MessageFeed 
            messages={messages} 
            isLoading={isLoading} 
            error={error}
            onDeleteMessage={deleteMessage}
            hasMore={hasMore}
            onLoadMore={loadMoreMessages}
            loadingMore={loadingMore}
          />
          
          {user ? (
            <MessageInput onSend={postMessage} />
          ) : (
            <LoginPrompt />
          )}
        </div>
      </PageTransition>
    </PageLayout>
  );
};

export default MessageBoard;
