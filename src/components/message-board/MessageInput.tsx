
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/designSystem";

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend }) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState(1);
  const maxLength = 500;
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Adjust rows based on content
    const lines = value.split('\n').length;
    const newRows = Math.min(Math.max(lines, 1), 5);
    setRows(newRows);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onSend(message.trim());
      setMessage("");
      setRows(1);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const charCount = message.length;
  const isAtLimit = charCount >= maxLength;
  
  return (
    <form 
      onSubmit={handleSubmit}
      className={cn(
        "flex flex-col gap-2 bg-background/90 backdrop-blur-md border-t p-4 fixed bottom-0 left-0 right-0",
        "md:rounded-lg md:border md:shadow-md md:mx-4 lg:mx-auto lg:max-w-3xl",
        animations.fadeIn
      )}
      style={{ bottom: "var(--bottombar-height, 0)" }}
    >
      <div className="flex items-start gap-2">
        <div className="mt-2 hidden sm:flex">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={handleChange}
            placeholder="Type a message..."
            disabled={isSubmitting}
            maxLength={maxLength}
            rows={rows}
            className={cn(
              "resize-none min-h-[40px] max-h-[120px] py-2 pr-12",
              "bg-background border-gray-200 focus-visible:ring-primary/50",
              isAtLimit && "border-yellow-500 focus-visible:ring-yellow-500/50"
            )}
          />
          
          {/* Character counter */}
          <div 
            className={cn(
              "absolute right-3 bottom-2 text-xs",
              isAtLimit ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"
            )}
          >
            {charCount}/{maxLength}
          </div>
        </div>
        
        <Button 
          type="submit" 
          size="icon"
          disabled={!message.trim() || isSubmitting || isAtLimit}
          className={cn(
            "mt-1 h-8 w-8 rounded-full",
            "bg-primary hover:bg-primary/90",
            !message.trim() && "opacity-50"
          )}
          aria-label="Send message"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
};

export default MessageInput;
