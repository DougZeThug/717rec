
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { BracketService } from "@/BracketService";
import { invalidateMatchRelatedQueries } from "@/hooks/matches/utils/queryCacheUtils";

export const usePlayoffBracketManagement = (
  refetchBrackets: () => Promise<any>,
  selectedBracketId: string | null,
  setSelectedBracketId: (id: string | null) => void
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleBracketCreated = () => {
    refetchBrackets();
  };

  const confirmDeleteBracket = async (
    bracketId: string,
    bracketName: string,
    isDeleting: boolean,
    setIsDeleting: (value: boolean) => void
  ) => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      await BracketService.deleteBracket(bracketId);
      
      toast({
        title: "Bracket Deleted",
        description: `"${bracketName}" has been successfully deleted.`,
      });
      
      // Reset selected bracket if we're deleting the current one
      if (selectedBracketId === bracketId) {
        setSelectedBracketId(null);
      }
      
      // Invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: ['brackets'] });
      await invalidateMatchRelatedQueries(queryClient);
      
      // Refetch bracket data
      refetchBrackets();
    } catch (error) {
      console.error("Error deleting bracket:", error);
      toast({
        title: "Error",
        description: "Failed to delete bracket. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleBracketCreated,
    confirmDeleteBracket
  };
};
