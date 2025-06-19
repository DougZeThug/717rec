
import React from "react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/theme/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import { cn } from "@/lib/utils";

interface NavActionsProps {
  className?: string;
  size?: "default" | "sm";
}

const NavActions: React.FC<NavActionsProps> = ({ 
  className,
  size = "default" 
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <UserMenu />
      <ThemeToggle size={size} />
    </div>
  );
};

export default NavActions;
