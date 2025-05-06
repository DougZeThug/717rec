
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MessageCategory } from "@/types/reactions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/designSystem";
import CategorySelector from "./CategorySelector";
import CharacterCounter from "./CharacterCounter";

interface MessageInputFormProps {
  onSend: (content: string, category: MessageCategory) => Promise<void>;
}

const MAX_MESSAGE_LENGTH = 500;

const MessageInputForm: React.FC<MessageInputFormProps> = ({ onSend }) => {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<MessageCategory>("General");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message before sending",
        variant: "destructive",
      });
      return;
    }
    
    if (message.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Please keep your message under ${MAX_MESSAGE_LENGTH} characters`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSending(true);
      // Trim the message to remove extra whitespace
      await onSend(message.trim(), category);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle textarea auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto resize the textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
  
  // Check if user is admin (for announcement capability)
  const isAdmin = user?.app_metadata?.role === 'admin' || 
                 user?.user_metadata?.isAdmin === true;
  
  return (
    <Card className={cn("border p-3 shadow-sm mt-3", animations.fadeInSlideUp)}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            placeholder="Type a message..."
            className="resize-none min-h-[80px] pr-16"
            disabled={isSending}
          />
          <div className="absolute bottom-2 right-2">
            <Button 
              size="sm"
              type="submit"
              disabled={isSending || message.length > MAX_MESSAGE_LENGTH}
              className="rounded-full h-8 w-8 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* Only show category selector for admins with Announcement option */}
            {isAdmin && (
              <CategorySelector 
                value={category} 
                onChange={setCategory} 
                adminOnly={true}
              />
            )}
          </div>
          
          <CharacterCounter 
            current={message.length} 
            max={MAX_MESSAGE_LENGTH} 
          />
        </div>
      </form>
    </Card>
  );
};

export default MessageInputForm;
