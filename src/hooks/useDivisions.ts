
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getUIErrorMessage, logError } from "@/utils/errors";

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
        const errorMessage = getUIErrorMessage(fetchError, "Database error");
        logError(fetchError, "useDivisions fetchDivisions");
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
      const errorMessage = getUIErrorMessage(error, "Unexpected error while fetching divisions");
      logError(error, "useDivisions fetchDivisions unexpected");
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
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
        const errorMessage = getUIErrorMessage(insertError, "Failed to create default divisions");
        logError(insertError, "useDivisions createDefaultDivisions");
        setError(errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log("useDivisions: Successfully created default divisions:", data?.length || 0);
      setDivisions(data || []);
      
      toast({
        title: "Divisions Created",
        description: "Default divisions have been created successfully.",
      });
    } catch (error) {
      const errorMessage = getUIErrorMessage(error, "Failed to create default divisions");
      logError(error, "useDivisions createDefaultDivisions");
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
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
