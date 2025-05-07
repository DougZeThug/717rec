
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Message } from "@/types/reactions";
import { useAuth } from "@/contexts/AuthContext";
import { useLongPress } from "@/hooks/useLongPress";
import { useMobile } from "@/hooks/use-mobile";
import { useTeamPowerScores } from "@/hooks/useTeamPowerScores";
import { cn } from "@/lib/utils";
import { formatTime } from "@/components/home/utils";
import { MessageReactions } from "./reactions";
import { animations, gradients } from "@/styles/design-system";
import { MessageHeader, MessageContent, MessageControls } from "./message-item";
import MessageEditForm from "./message-item/MessageEditForm";

interface MessageItemProps {
  message: Message;
  onDelete?: (messageId: string) => Promise<void>;
  onEdit?: (messageId: string, content: string) => Promise<void>;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onDelete, onEdit }) => {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [showOptions, setShowOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { getTeamPowerScore } = useTeamPowerScores();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Get power score for the team
  const powerScore = getTeamPowerScore(message.team_id);
  
  // Format the time in a more compact way using our formatTime utility
  const timeString = formatTime(message.created_at);

  // Check if the current user is the author of the message
  const isAuthor = user?.id === message.user_id;
  
  // Only show Announcement badge
  const isAnnouncement = message.category === 'Announcement';
  
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

  // Handle edit action
  const handleEdit = () => {
    setIsEditing(true);
    setShowOptions(false);
  };

  // Handle saving edited message
  const handleSaveEdit = async (content: string) => {
    if (onEdit) {
      await onEdit(message.id, content);
      setIsEditing(false);
    }
  };

  // Configure the long press handler for mobile
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (isAuthor && isMobile) {
        setShowOptions(true);
      } else {
        setShowReactionPicker(true);
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
  useEffect(() => {
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
          <MessageHeader 
            username={message.username}
            teamName={message.team_name}
            timeString={timeString}
            powerScore={powerScore}
            isAnnouncement={isAnnouncement}
          />
          
          {isEditing ? (
            <MessageEditForm 
              content={message.content}
              onSave={handleSaveEdit}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <MessageContent 
              content={message.content} 
              isEdited={message.is_edited}
              updatedAt={message.updated_at}
            />
          )}
          
          {/* Message Reactions */}
          {!isEditing && (
            <MessageReactions 
              messageId={message.id} 
              showPicker={showReactionPicker} 
              onPickerClose={() => setShowReactionPicker(false)} 
            />
          )}
        </CardContent>
        
        {/* Message Controls for editing/deleting messages */}
        {!isEditing && (
          <MessageControls 
            isAuthor={isAuthor}
            showOptions={showOptions}
            isDeleting={isDeleting}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            setShowOptions={setShowOptions}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
      </Card>
    </>
  );
};

export default MessageItem;
