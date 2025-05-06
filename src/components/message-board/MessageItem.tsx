
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Message } from "@/types/reactions";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useLongPress } from "@/hooks/useLongPress";
import { useMobile } from "@/hooks/use-mobile";
import { Trash2, Clock, ChevronDown, ChevronUp, Tag } from "lucide-react";
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
import { formatTime } from "@/components/home/utils";
import MessageReactions from "./MessageReactions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { animations, gradients } from "@/styles/designSystem";
import { Badge } from "@/components/ui/badge";

interface MessageItemProps {
  message: Message;
  onDelete?: (messageId: string) => Promise<void>;
}

const MAX_MESSAGE_LENGTH = 280; // Length before collapsing a message

const MessageItem: React.FC<MessageItemProps> = ({ message, onDelete }) => {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [showOptions, setShowOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { getTeamPowerScore } = useTeamPowerScores();
  const [expanded, setExpanded] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  // Check if message is long and needs expansion/collapsing
  const isLongMessage = message.content.length > MAX_MESSAGE_LENGTH;
  const displayedContent = isLongMessage && !expanded 
    ? message.content.slice(0, MAX_MESSAGE_LENGTH) + '...'
    : message.content;
  
  // Check if the current user is the author of the message
  const isAuthor = user?.id === message.user_id;
  
  // Get power score for the team
  const powerScore = getTeamPowerScore(message.team_id);
  
  // Format the time in a more compact way using our formatTime utility
  const timeString = formatTime(message.created_at);

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
      setShowReactionPicker(true);
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
  
  // Only show Announcement badge
  const isAnnouncement = message.category === 'Announcement';
  
  return (
    <>
      <Card 
        className={cn(
          "mb-2 overflow-hidden relative border shadow-sm transition-all duration-200",
          isAuthor ? gradients.card.highlight : gradients.card.default,
          isAuthor ? "hover:shadow-md" : "",
          isAnnouncement ? "border-blue-300 dark:border-blue-800" : "",
          animations.fadeIn
        )}
        {...longPressHandlers}
        onClick={isAuthor ? handleDesktopClick : undefined}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-2 max-w-full">
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div>
                      <TeamNameDisplay 
                        username={message.username}
                        teamName={message.team_name}
                        powerScore={powerScore}
                        compact={true}
                      />
                    </div>
                  </TooltipTrigger>
                  {powerScore && (
                    <TooltipContent side="top" className="px-3 py-1.5">
                      <p className="text-xs font-medium">
                        Team Power Score: {powerScore.toFixed(1)}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              
              <span className="text-xs text-muted-foreground flex items-center whitespace-nowrap">
                <Clock className="h-3 w-3 opacity-70 inline mr-0.5" />
                {timeString}
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
          
          {/* Message Category - Only show for Announcements */}
          {isAnnouncement && (
            <Badge 
              variant="outline" 
              className="mb-2 text-xs font-medium px-2 py-0.5 flex items-center gap-0.5 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
            >
              <Tag className="h-3 w-3 mr-0.5" />
              Announcement
            </Badge>
          )}
          
          <div className="break-words whitespace-pre-wrap text-foreground text-sm leading-relaxed">
            {displayedContent}
          </div>
          
          {/* Expand/Collapse Button for long messages */}
          {isLongMessage && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mt-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span>Show less</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>Read more</span>
                </>
              )}
            </button>
          )}
          
          {/* Message Reactions */}
          <MessageReactions messageId={message.id} showPicker={showReactionPicker} onPickerClose={() => setShowReactionPicker(false)} />
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
