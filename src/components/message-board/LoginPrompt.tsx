
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const LoginPrompt: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center justify-center gap-2 bg-muted/50 border-t p-3 fixed bottom-0 left-0 right-0 md:p-4"
      style={{ bottom: "var(--bottombar-height, 0)" }}
    >
      <p className="text-muted-foreground">
        Login to post a message
      </p>
      <Button 
        onClick={() => navigate("/auth", { state: { returnTo: "/message-board" } })}
        variant="default"
        size="sm"
      >
        Login
      </Button>
    </div>
  );
};

export default LoginPrompt;
