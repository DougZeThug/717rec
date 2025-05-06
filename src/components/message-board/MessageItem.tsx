
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Message } from "@/hooks/useMessageBoard";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useLongPress } from "@/hooks/useLongPress";
import { useMobile } from "@/hooks/use-mobile";
import { Trash2, Clock } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import TeamNameDisplay from "./TeamNameDisplay";
import { useTeamPowerScores } from "@/hooks/useTeamPowerScores";
import { cn } from "@/lib/utils";

interface MessageItemProps {
  message: Message;
  onDelete?: (messageId: string) => Promise<void>;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onDelete }) => {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [showOptions, setShowOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { getTeamPowerScore } = useTeamPowerScores();
  
  // Check if the current user is the author of the message
  const isAuthor = user?.id === message.user_id;
  
  // Get power score for the team
  const powerScore = getTeamPowerScore(message.team_id);
  
  const formattedTime = formatDistanceToNow(new Date(message.created_at), { 
    addSuffix: true,
    includeSeconds: true
  });

  // Handle the delete action
  const handleDelete = async () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(message.id);
      } finally {
        setIsDeleting(false);
        setShowOptions(false);
      }
    }
  };

  // Configure the long press handler
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (isAuthor && isMobile) {
        setShowOptions(true);
      }
    }
  });

  // For desktop, we use click/hover
  const handleDesktopClick = () => {
    if (isAuthor && !isMobile) {
      setShowOptions(!showOptions);
    }
  };

  // Close options when clicking outside
  React.useEffect(() => {
    if (showOptions) {
      const handleClickOutside = () => setShowOptions(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showOptions]);
  
  return (
    <>
      <Card 
        className={cn(
          "mb-2 overflow-hidden relative border shadow-sm transition-shadow hover:shadow-md",
          isAuthor ? "bg-gradient-to-br from-slate-50 to-white dark:from-gray-800/70 dark:to-gray-900/70" : ""
        )}
        {...(isAuthor ? (isMobile ? longPressHandlers : { onClick: handleDesktopClick }) : {})}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1 max-w-[85%]">
              <TeamNameDisplay 
                username={message.username}
                teamName={message.team_name}
                powerScore={powerScore}
                compact={true}
              />
              <span className="text-xs text-muted-foreground flex items-center whitespace-nowrap ml-1">
                <Clock className="h-3 w-3 opacity-70 inline mr-0.5" />
                {formattedTime}
              </span>
            </div>
            
            {/* Delete Option - Only visible when showOptions is true and user is author */}
            {isAuthor && showOptions && (
              <div 
                className="absolute right-3 top-3 p-1 bg-background/90 rounded-md border shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                  setShowOptions(false);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80 cursor-pointer" />
              </div>
            )}
          </div>
          <div className="break-words whitespace-pre-wrap text-foreground text-sm leading-relaxed">
            {message.content}
          </div>
        </CardContent>
      </Card>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              disabled={isDeleting} 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageItem;
