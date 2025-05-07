
import React from "react";
import PageLayout from "@/components/layout/PageLayout";
import PageTransition from "@/components/transitions/PageTransition";
import { useMessageBoard } from "@/hooks/useMessageBoard";
import { useAuth } from "@/contexts/AuthContext";
import MessageFeed from "@/components/message-board/MessageFeed";
import MessageInput from "@/components/message-board/MessageInput";
import LoginPrompt from "@/components/message-board/LoginPrompt";
import MessageFilterBar from "@/components/message-board/MessageFilterBar";
import PageHeader from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { animations, gradients } from "@/styles/design-system";
import { MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const MessageBoard: React.FC = () => {
  const { 
    messages, 
    isLoading, 
    error, 
    postMessage, 
    editMessage,
    deleteMessage, 
    hasMore, 
    loadingMore,
    loadMoreMessages,
    refreshMessages,
    filterOptions,
    setFilter
  } = useMessageBoard();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMessages();
      toast({
        title: "Messages refreshed",
        description: "Latest messages have been loaded",
      });
    } catch (err) {
      toast({
        title: "Refresh failed",
        description: "Could not refresh messages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <PageLayout>
      <PageTransition animation="fadeInSlideDown">
        <div className="container max-w-4xl mx-auto px-4 pb-20 md:pb-24">
          <div 
            className={cn(
              "sticky top-0 z-10 bg-background/80 backdrop-blur-md pb-3 pt-1",
              gradients.section.subtle
            )}
          >
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
            
            {/* Filter Bar with Refresh button */}
            <div className={cn(animations.fadeInSlideDown)}>
              <MessageFilterBar
                filterOptions={filterOptions}
                onFilterChange={setFilter}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
              />
            </div>
          </div>
          
          <div 
            className={animations.fadeInSlideUp}
            aria-live="polite"
            aria-busy={isLoading}
          >
            <MessageFeed 
              messages={messages} 
              isLoading={isLoading} 
              error={error}
              onDeleteMessage={deleteMessage}
              onEditMessage={editMessage}
              hasMore={hasMore}
              onLoadMore={loadMoreMessages}
              loadingMore={loadingMore}
            />
          </div>
          
          <div className={cn(animations.fadeIn, "animation-delay-300")}>
            {user ? (
              <MessageInput onSend={postMessage} />
            ) : (
              <LoginPrompt />
            )}
          </div>
        </div>
      </PageTransition>
    </PageLayout>
  );
};

export default MessageBoard;
