
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/user";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

export const useAuthProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  // Fetch user profile data
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return data as UserProfile;
    } catch (error) {
      console.error("Unexpected error fetching profile:", error);
      return null;
    }
  };

  // Refresh the current user's profile
  const refreshProfile = async (user: User | null) => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
    return profileData;
  };

  // Check if user needs to set up profile
  const checkProfileSetup = (profileData: UserProfile | null) => {
    if (profileData && !profileData.username) {
      navigate("/setup-profile");
    }
  };

  return {
    profile,
    setProfile,
    fetchProfile,
    refreshProfile,
    checkProfileSetup
  };
};
