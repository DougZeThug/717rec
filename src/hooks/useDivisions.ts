
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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDivisions();
  }, []);

  const fetchDivisions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("useDivisions: Fetching divisions from database");
      
      const { data, error: fetchError } = await supabase
        .from('divisions')
        .select('*')
        .order('name');

      if (fetchError) {
        console.error("useDivisions: Database error:", fetchError);
        const errorMessage = `Database error: ${fetchError.message}`;
        setError(errorMessage);
        toast({
          title: "Database Error",
          description: "Failed to fetch divisions. Please check your database connection.",
          variant: "destructive"
        });
        return;
      }

      console.log("useDivisions: Successfully fetched divisions:", data?.length || 0);
      setDivisions(data || []);
      
      // If no divisions exist, create default ones
      if (!data || data.length === 0) {
        console.log("useDivisions: No divisions found, creating default divisions");
        await createDefaultDivisions();
      }
    } catch (error) {
      console.error("useDivisions: Unexpected error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
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
      console.log("useDivisions: Creating default divisions");
      
      const defaultDivisions = [
        { name: 'Recreational' },
        { name: 'Intermediate' },
        { name: 'Competitive' }
      ];
      
      const { data, error: insertError } = await supabase
        .from('divisions')
        .insert(defaultDivisions)
        .select();
        
      if (insertError) {
        console.error("useDivisions: Error creating default divisions:", insertError);
        const errorMessage = `Failed to create default divisions: ${insertError.message}`;
        setError(errorMessage);
        throw insertError;
      }
      
      console.log("useDivisions: Successfully created default divisions:", data?.length || 0);
      setDivisions(data || []);
      
      toast({
        title: "Divisions Created",
        description: "Default divisions have been created successfully.",
      });
    } catch (error) {
      console.error("useDivisions: Error in createDefaultDivisions:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create default divisions";
      setError(errorMessage);
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
    error,
    fetchDivisions
  };
}
