import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BlindDrawSignup {
  id: string;
  event_date: string;
  first_name: string;
  last_initial: string;
  created_at: string;
}

// Fetch signups for admin view (requires admin role)
export const useBlindDrawSignups = (eventDate?: string) => {
  return useQuery({
    queryKey: ["blind-draw-signups", eventDate],
    queryFn: async () => {
      let query = supabase
        .from("blind_draw_signups")
        .select("*")
        .order("created_at", { ascending: true });

      if (eventDate) {
        query = query.eq("event_date", eventDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BlindDrawSignup[];
    },
  });
};

// Add a signup (public, no auth required)
export const useAddBlindDrawSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventDate,
      firstName,
      lastInitial,
    }: {
      eventDate: string;
      firstName: string;
      lastInitial: string;
    }) => {
      const { error } = await supabase
        .from("blind_draw_signups")
        .insert({
          event_date: eventDate,
          first_name: firstName.trim(),
          last_initial: lastInitial.trim().toUpperCase(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blind-draw-signups"] });
      toast.success("You're signed up! See you Thursday!");
    },
    onError: (error) => {
      console.error("Signup error:", error);
      toast.error("Failed to sign up. Please try again.");
    },
  });
};

// Delete a signup (admin only)
export const useDeleteBlindDrawSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blind_draw_signups")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blind-draw-signups"] });
      toast.success("Signup removed");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to remove signup");
    },
  });
};

// Clear all signups for a date (admin only)
export const useClearBlindDrawSignups = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventDate: string) => {
      const { error } = await supabase
        .from("blind_draw_signups")
        .delete()
        .eq("event_date", eventDate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blind-draw-signups"] });
      toast.success("All signups cleared");
    },
    onError: (error) => {
      console.error("Clear error:", error);
      toast.error("Failed to clear signups");
    },
  });
};
