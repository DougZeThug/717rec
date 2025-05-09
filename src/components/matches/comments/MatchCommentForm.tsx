
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { LoginRequired } from "@/components/auth";

interface MatchCommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
}

const MatchCommentForm: React.FC<MatchCommentFormProps> = ({ 
  onSubmit, 
  placeholder = "Add a comment..." 
}) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await onSubmit(content);
      setContent("");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!user) {
    return (
      <LoginRequired 
        message="Sign in to comment on matches" 
        fallback={
          <div className="bg-muted/30 rounded-md px-4 py-3 text-sm text-muted-foreground">
            Sign in to comment on this match
          </div>
        }
      />
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={cn(
        "flex items-start border rounded-md bg-background transition-all",
        "focus-within:ring-1 focus-within:ring-ring focus-within:border-input"
      )}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={1}
          className={cn(
            "flex-1 py-2 px-3 resize-none outline-none bg-transparent",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:border-none focus:ring-0"
          )}
          style={{ minHeight: "2.5rem", maxHeight: "8rem" }}
        />
        <Button 
          type="submit"
          size="sm"
          disabled={!content.trim() || isSubmitting}
          variant="ghost"
          className="mt-1 mr-1 h-8 w-8 rounded-full p-0 text-primary"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send comment</span>
        </Button>
      </div>
    </form>
  );
};

export default MatchCommentForm;
