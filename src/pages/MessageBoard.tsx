
import React from "react";
import PageLayout from "@/components/layout/PageLayout";
import PageTransition from "@/components/transitions/PageTransition";
import { useMessageBoard } from "@/hooks/useMessageBoard";
import { useAuth } from "@/contexts/AuthContext";
import MessageFeed from "@/components/message-board/MessageFeed";
import MessageInput from "@/components/message-board/MessageInput";
import LoginPrompt from "@/components/message-board/LoginPrompt";

const MessageBoard: React.FC = () => {
  const { messages, isLoading, error, postMessage, deleteMessage } = useMessageBoard();
  const { user } = useAuth();
  
  return (
    <PageLayout>
      <PageTransition>
        <div className="container max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-6">Message Board</h1>
          
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
