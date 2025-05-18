
import { useState } from 'react';
import { PlayoffMatch } from '@/types';
import { useToast } from "@/hooks/use-toast";

export const usePlayoffDialogs = () => {
  // Team division dialog state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  
  // Bracket creation/edit dialog state
  const [bracketDialogOpen, setBracketDialogOpen] = useState(false);
  
  // Match editor state
  const [editingMatch, setEditingMatch] = useState<PlayoffMatch | null>(null);
  const [isQuickEdit, setIsQuickEdit] = useState(false);
  
  // Delete bracket confirmation dialog state
  const [deletingBracket, setDeletingBracket] = useState<{ id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast } = useToast();

  // Handle opening match editor
  const openMatchEditor = (match: PlayoffMatch, quickEdit: boolean = false) => {
    setEditingMatch(match);
    setIsQuickEdit(quickEdit);
  };

  // Handle closing match editor
  const closeMatchEditor = () => {
    setEditingMatch(null);
    setIsQuickEdit(false);
  };

  // Handle opening bracket deletion confirmation
  const openDeleteBracketConfirmation = (bracketId: string, bracketName: string) => {
    setDeletingBracket({ id: bracketId, name: bracketName });
  };

  // Handle closing bracket deletion confirmation
  const closeDeleteBracketConfirmation = () => {
    setDeletingBracket(null);
    setIsDeleting(false);
  };

  return {
    // Team dialog
    teamDialogOpen,
    setTeamDialogOpen,
    
    // Bracket dialog
    bracketDialogOpen,
    setBracketDialogOpen,
    
    // Match editor
    editingMatch,
    isQuickEdit,
    openMatchEditor,
    closeMatchEditor,
    
    // Delete bracket dialog
    deletingBracket,
    setDeletingBracket,
    isDeleting,
    setIsDeleting,
    openDeleteBracketConfirmation,
    closeDeleteBracketConfirmation,
  };
};
