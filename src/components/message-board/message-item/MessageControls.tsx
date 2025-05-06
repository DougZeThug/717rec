
import React from "react";
import { Trash2 } from "lucide-react";
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

interface MessageControlsProps {
  isAuthor: boolean;
  showOptions: boolean;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  setShowOptions: (show: boolean) => void;
  onDelete: () => Promise<void>;
}

const MessageControls: React.FC<MessageControlsProps> = ({
  isAuthor,
  showOptions,
  isDeleting,
  showDeleteConfirm,
  setShowDeleteConfirm,
  setShowOptions,
  onDelete
}) => {
  return (
    <>
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
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageControls;
