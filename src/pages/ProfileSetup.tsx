
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import PageLayout from "@/components/layout/PageLayout";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import PageTransition from "@/components/transitions/PageTransition";

const ProfileSetup = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
  
  // Redirect if user is not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);
  
  // Pre-fill form if profile exists
  useEffect(() => {
    if (profile) {
      if (profile.username) setUsername(profile.username);
      if (profile.full_name) setFullName(profile.full_name);
      
      // If they already have a username set, we'll still let them update
      // But this isn't the "first time" flow
      if (profile.username) {
        setUsernameAvailable(true);
      }
    }
  }, [profile]);

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
      if (profile?.username === value) {
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
  useEffect(() => {
    if (!username || username.length < 3) return;
    
    const handler = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);
    
    return () => clearTimeout(handler);
  }, [username]);

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
      setIsLoading(true);
      
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
      
      // Refresh profile data in context
      await refreshProfile();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      
      // Redirect to home page
      navigate("/");
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout compact={true}>
      <PageTransition>
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Set Up Your Profile</CardTitle>
              <CardDescription>
                Choose a username and add your details
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      disabled={isLoading}
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
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">Use your real name so teammates know who you are.</p>
                </div>
                
                <Button
                  type="submit"
                  className="w-full mt-6"
                  disabled={isLoading || !!usernameError || username.length < 3}
                >
                  {isLoading ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                This information will be visible to other users
              </p>
            </CardFooter>
          </Card>
        </div>
      </PageTransition>
    </PageLayout>
  );
};

export default ProfileSetup;
