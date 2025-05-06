
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

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
      className="flex items-center gap-2 bg-background border-t p-3 fixed bottom-0 left-0 right-0 md:p-4"
      style={{ bottom: "var(--bottombar-height, 0)" }}
    >
      <Input 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={isSubmitting}
        className="flex-1"
      />
      <Button 
        type="submit" 
        disabled={!message.trim() || isSubmitting}
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
