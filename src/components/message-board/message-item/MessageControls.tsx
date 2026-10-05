import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface MessageControlsProps {
  isAuthor: boolean;
  showOptions: boolean;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  setShowOptions: (show: boolean) => void;
  onDelete: () => Promise<void>;
  onEdit: () => void;
}

const MessageControls: React.FC<MessageControlsProps> = ({
  isAuthor,
  showOptions,
  isDeleting,
  showDeleteConfirm,
  setShowDeleteConfirm,
  setShowOptions,
  onDelete,
  onEdit,
}) => {
  return (
    <>
      {/* A visible way in for the author. On a phone the only other way was a long
          press, which nothing on the screen hints at. */}
      {isAuthor && !showOptions && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1 text-muted-foreground"
          aria-label="Message options"
          onClick={(e) => {
            e.stopPropagation();
            setShowOptions(true);
          }}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      )}

      {/* Message Options - Only visible when showOptions is true and user is author */}
      {isAuthor && showOptions && (
        <div
          className="absolute right-1 top-1 p-0.5 bg-background/90 rounded-md border shadow-xs flex gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Edit option */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit message"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setShowOptions(false);
            }}
          >
            <Pencil className="size-4 text-primary" />
          </Button>

          {/* Delete option */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete message"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
              setShowOptions(false);
            }}
          >
            <Trash2 className="size-4 text-destructive-text" />
          </Button>
        </div>
      )}

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
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageControls;
