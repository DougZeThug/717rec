
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <>{children}</>;
  }

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
