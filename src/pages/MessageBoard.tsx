
import React from "react";
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
import { MessageSquare } from "lucide-react";

const MessageBoard: React.FC = () => {
  const { messages, isLoading, error, postMessage, deleteMessage } = useMessageBoard();
  const { user } = useAuth();
  
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
          </div>
          
          <MessageFeed 
            messages={messages} 
            isLoading={isLoading} 
            error={error}
            onDeleteMessage={deleteMessage}
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
