
import React from "react";
import { useAuth } from "@/contexts/AuthContext";

interface LoginRequiredProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  message?: string;
}

const LoginRequired: React.FC<LoginRequiredProps> = ({ 
  children, 
  fallback, 
  message = "Please sign in to access this content"
}) => {
  const { user } = useAuth();
  
  if (user) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <div className="flex items-center justify-center p-4 border rounded-md bg-muted/50">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

export default LoginRequired;
