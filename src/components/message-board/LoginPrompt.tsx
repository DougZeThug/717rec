
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { animations } from "@/styles/design-system";
import { cn } from "@/lib/utils";

const LoginPrompt: React.FC = () => {
  return (
    <Card className={cn("p-4 text-center", animations.fadeIn)}>
      <div className="flex flex-col items-center gap-2">
        <LogIn className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Sign in to join the conversation
        </p>
        <Button asChild size="sm" className="mt-2">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    </Card>
  );
};

export default LoginPrompt;
