
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";

interface LoginRequiredProps {
  children: React.ReactNode;
  message?: string;
  fallback?: React.ReactNode;
}

const LoginRequired: React.FC<LoginRequiredProps> = ({ 
  children, 
  message = "You must log in to use this feature.",
  fallback
}) => {
  const { user, isLoading, authInitialized } = useAuth();
  const navigate = useNavigate();
  const [showLoading, setShowLoading] = useState(true);

  // Set a timeout to show loading state for a minimum time
  // This prevents flickering and gives auth time to initialize
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Show loading spinner while auth is initializing or minimum loading time hasn't passed
  if (isLoading || (!authInitialized && showLoading)) {
    return (
      <div className="border rounded-md p-8 flex flex-col items-center justify-center text-center gap-4 bg-muted/50">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  // If auth is initialized and we have a user, show the content
  if (user) {
    return <>{children}</>;
  }

  // If auth is initialized, we've waited, and there's no user, show the fallback or login prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="border rounded-md p-4 flex flex-col items-center justify-center text-center gap-2 bg-muted/50">
      <p className="text-muted-foreground">{message}</p>
      <Button size="sm" onClick={() => navigate("/auth")}>
        Login / Sign Up
      </Button>
    </div>
  );
};

export default LoginRequired;
