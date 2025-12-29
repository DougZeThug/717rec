
import React, { useState } from "react";
import { MoreHorizontal, Trash, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import TeamNameDisplay from "@/components/message-board/TeamNameDisplay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MatchComment } from "@/hooks/matches/useMatchComments";
import { animations } from "@/styles/design-system";

interface MatchCommentItemProps {
  comment: MatchComment;
  onDelete: (id: string) => Promise<boolean>;
}

const MatchCommentItem: React.FC<MatchCommentItemProps> = ({ comment, onDelete }) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const isAuthor = user?.id === comment.user_id;
  
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(comment.id);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className={cn(
      "py-2 flex group",
      animations.fadeIn,
      isDeleting && "opacity-50 pointer-events-none"
    )}>
      {/* Comment content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TeamNameDisplay 
            username={comment.username}
            teamName={comment.team_name}
            compact={true}
          />
        </div>
        <div className="mt-1 text-sm whitespace-pre-wrap break-words">
          {comment.content}
        </div>
      </div>
      
      {/* Comment actions */}
      {isAuthor && (
        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
                <span className="sr-only">{isDeleting ? "Deleting..." : "Open menu"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

export default MatchCommentItem;
