
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Division {
  id: string;
  name: string;
}

export function useDivisions() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDivisions();
  }, []);

  const fetchDivisions = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .order('name');

      if (error) {
        console.error("Error fetching divisions:", error);
        toast({
          title: "Error",
          description: "Failed to fetch divisions. Please try again.",
          variant: "destructive"
        });
        return;
      }

      setDivisions(data || []);
      
      // If no divisions exist, create default ones
      if (data.length === 0) {
        await createDefaultDivisions();
      }
    } catch (error) {
      console.error("Error in divisions hook:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching divisions.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultDivisions = async () => {
    try {
      const defaultDivisions = [
        { name: 'Recreational' },
        { name: 'Intermediate' },
        { name: 'Competitive' }
      ];
      
      const { data, error } = await supabase
        .from('divisions')
        .insert(defaultDivisions)
        .select();
        
      if (error) {
        throw error;
      }
      
      setDivisions(data || []);
    } catch (error) {
      console.error("Error creating default divisions:", error);
      toast({
        title: "Error",
        description: "Failed to create default divisions.",
        variant: "destructive"
      });
    }
  };

  return {
    divisions,
    isLoading,
    fetchDivisions
  };
}
