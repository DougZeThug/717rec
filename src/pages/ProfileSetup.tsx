
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import PageLayout from "@/components/layout/PageLayout";
import PageTransition from "@/components/transitions/PageTransition";
import TeamMembershipSection from "@/components/teams/TeamMembershipSection";
import { Separator } from "@/components/ui/separator";
import ProfileForm from "@/components/profile/ProfileForm";
import ProfileLoadingState from "@/components/profile/ProfileLoadingState";

const ProfileSetup = () => {
  const { user, profile, refreshProfile, isLoading, authInitialized } = useAuth();
  const navigate = useNavigate();
  const [retries, setRetries] = useState(0);
  const maxRetries = 3;
  
  // Handle auth state and redirects
  useEffect(() => {
    // If authentication is still initializing, wait
    if (!authInitialized) {
      console.log("Auth not initialized yet, waiting...");
      return;
    }

    // If authentication is no longer loading but we have no user
    if (!isLoading && !user) {
      if (retries < maxRetries) {
        // Try a few more times with a delay
        console.log(`No user found, retrying in 1s (${retries + 1}/${maxRetries})`);
        const timer = setTimeout(() => {
          setRetries(prev => prev + 1);
        }, 1000);
        
        return () => clearTimeout(timer);
      } else {
        // After max retries, redirect to auth
        console.log("Max retries reached, redirecting to auth");
        navigate("/auth", { state: { returnTo: "/setup-profile" } });
      }
    }
  }, [user, isLoading, authInitialized, navigate, retries]);
  
  const handleProfileUpdated = async () => {
    await refreshProfile();
    navigate("/");
  };

  // Show loading state while waiting for auth to initialize
  if (isLoading || (!authInitialized && retries < maxRetries)) {
    return (
      <PageLayout compact={true}>
        <PageTransition>
          <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
            <ProfileLoadingState />
          </div>
        </PageTransition>
      </PageLayout>
    );
  }

  // No user after retries
  if (!user && retries >= maxRetries) {
    return null; // Will redirect in useEffect
  }

  return (
    <PageLayout compact={true}>
      <PageTransition>
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Set Up Your Profile</CardTitle>
              <CardDescription>
                Enter your name and details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm 
                initialUsername={profile?.username || ""}
                initialFullName={profile?.full_name || ""}
                onProfileUpdated={handleProfileUpdated}
              />

              {/* Team Membership Section */}
              {user && (
                <>
                  <Separator className="my-6" />
                  <TeamMembershipSection />
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                This information will be visible to other players
              </p>
            </CardFooter>
          </Card>
        </div>
      </PageTransition>
    </PageLayout>
  );
};

export default ProfileSetup;
