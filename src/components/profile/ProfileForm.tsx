
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileFormProps {
  initialUsername: string;
  initialFullName: string;
  onProfileUpdated: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  initialUsername,
  initialFullName,
  onProfileUpdated,
}) => {
  const { user } = useAuth();
  const [username, setUsername] = useState<string>(initialUsername);
  const [fullName, setFullName] = useState<string>(initialFullName);
  const [isFormLoading, setIsFormLoading] = useState<boolean>(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);

  // Check username availability
  const checkUsernameAvailability = async (value: string) => {
    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      setUsernameAvailable(null);
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      setUsernameAvailable(null);
      return;
    }
    
    try {
      setIsCheckingUsername(true);
      
      // Skip the check if it's their current username
      if (initialUsername === value) {
        setUsernameError(null);
        setUsernameAvailable(true);
        return;
      }
      
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", value)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking username:", error);
        setUsernameError("Error checking username availability");
        setUsernameAvailable(null);
        return;
      }
      
      const isAvailable = !data;
      setUsernameAvailable(isAvailable);
      setUsernameError(isAvailable ? null : "Username is already taken");
    } catch (error) {
      console.error("Unexpected error checking username:", error);
      setUsernameError("Error checking username availability");
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Debounce username checks
  React.useEffect(() => {
    if (!username || username.length < 3) return;
    
    const handler = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);
    
    return () => clearTimeout(handler);
  }, [username, initialUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (usernameError || !usernameAvailable) {
      toast({
        title: "Invalid username",
        description: usernameError || "Please choose another username",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsFormLoading(true);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          full_name: fullName || null,
        })
        .eq("id", user.id);
      
      if (error) {
        toast({
          title: "Error updating profile",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      
      onProfileUpdated();
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsFormLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">
          Username <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pr-10"
            placeholder="Choose a unique username"
            disabled={isFormLoading}
          />
          {username.length >= 3 && !isCheckingUsername && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {usernameAvailable === true ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : usernameAvailable === false ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : null}
            </div>
          )}
        </div>
        {usernameError && <p className="text-sm text-destructive">{usernameError}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name (Optional)</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          disabled={isFormLoading}
        />
        <p className="text-sm text-muted-foreground">Use your real name so teammates know who you are.</p>
      </div>
      
      <Button
        type="submit"
        className="w-full mt-6"
        disabled={isFormLoading || !!usernameError || username.length < 3}
      >
        {isFormLoading ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  );
};

export default ProfileForm;
