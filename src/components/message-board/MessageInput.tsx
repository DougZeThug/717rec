
import React, { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { SendIcon, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { MESSAGE_CATEGORIES, MessageCategory } from "@/types/reactions";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { animations, gradients } from "@/styles/designSystem";

interface MessageInputProps {
  onSend: (content: string, category: MessageCategory) => Promise<void>;
}

const MAX_MESSAGE_LENGTH = 500;

const MessageInput: React.FC<MessageInputProps> = ({ onSend }) => {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<MessageCategory>("General");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea as content grows
  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setMessage(textarea.value);
    
    // Auto resize logic
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSending) return;
    
    try {
      setIsSending(true);
      await onSend(message.trim(), category);
      setMessage("");
      
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const charactersRemaining = MAX_MESSAGE_LENGTH - message.length;
  const isOverLimit = charactersRemaining < 0;

  return (
    <Card className={cn("sticky bottom-0 border shadow-sm", gradients.card.subtle, animations.fadeInSlideUp)}>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-3 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Select value={category} onValueChange={(value) => setCategory(value as MessageCategory)}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            placeholder="Type your message here..."
            className={cn(
              "min-h-[60px] resize-none transition-all duration-200 focus-visible:ring-1",
              isOverLimit ? "border-red-500 focus-visible:ring-red-500" : ""
            )}
          />
          
          <div className="flex justify-between items-center mt-1">
            <span 
              className={cn(
                "text-xs", 
                charactersRemaining < 50 ? "text-yellow-500" : "text-muted-foreground",
                isOverLimit ? "text-red-500" : ""
              )}
            >
              {charactersRemaining} characters remaining
            </span>
          </div>
        </CardContent>
        
        <CardFooter className="px-3 py-2 flex justify-end border-t">
          <Button 
            type="submit"
            size="sm" 
            disabled={message.trim() === "" || isOverLimit || isSending}
            className={cn(
              "gap-1",
              isSending ? "opacity-80" : ""
            )}
          >
            <SendIcon className="h-4 w-4" />
            <span>{isSending ? "Sending..." : "Send"}</span>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default MessageInput;
