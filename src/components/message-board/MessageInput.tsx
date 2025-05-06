
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare } from "lucide-react";

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend }) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onSend(message);
      setMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form 
      onSubmit={handleSubmit}
      className="flex items-center gap-3 bg-background/80 backdrop-blur-md border-t p-4 fixed bottom-0 left-0 right-0 md:rounded-lg md:border md:shadow-md md:mx-4 lg:mx-auto lg:max-w-3xl"
      style={{ bottom: "var(--bottombar-height, 0)" }}
    >
      <MessageSquare className="h-5 w-5 text-muted-foreground hidden sm:block" />
      <Input 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={isSubmitting}
        className="flex-1 border-gray-200 focus-visible:ring-primary/50"
      />
      <Button 
        type="submit" 
        disabled={!message.trim() || isSubmitting}
        size="sm"
        className="px-4"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Post"
        )}
      </Button>
    </form>
  );
};

export default MessageInput;
