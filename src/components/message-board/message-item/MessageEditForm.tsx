
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, X, Check } from "lucide-react";

interface MessageEditFormProps {
  content: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  isProcessing?: boolean;
}

const MessageEditForm: React.FC<MessageEditFormProps> = ({
  content,
  onSave,
  onCancel,
  isProcessing = false
}) => {
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    // Focus the textarea when the component mounts
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at the end of the text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editedContent.trim() === "") {
      return;
    }
    
    if (editedContent === content) {
      onCancel();
      return;
    }
    
    setIsSaving(true);
    
    try {
      await onSave(editedContent);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit(e);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full min-h-[80px] p-2 border rounded-md focus:outline-none focus:ring-1",
            "focus:ring-primary/40 resize-none text-sm"
          )}
          placeholder="Edit message..."
          disabled={isProcessing || isSaving}
        />
        <div className="text-xs text-muted-foreground mt-1">
          Press Esc to cancel, Ctrl+Enter to save
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing || isSaving}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button 
          type="submit"
          size="sm"
          disabled={isProcessing || isSaving || !editedContent.trim() || editedContent === content}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Save
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default MessageEditForm;
