
import React from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import ThemeToggle from "@/components/ui/theme/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/contexts/NavigationContext";
import { gradients } from "@/styles/design-system";

interface NavActionsProps {
  className?: string;
  size?: "default" | "sm";
}

const NavActions: React.FC<NavActionsProps> = ({ 
  className,
  size = "default" 
}) => {
  const location = useLocation();
  const { navigateWithTransition } = useNavigation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleMessageBoardClick = () => {
    navigateWithTransition('/message-board');
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <UserMenu />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleMessageBoardClick}
        className={cn(
          "rounded-full text-white hover:bg-white/10 dark:hover:bg-gray-700/80",
          isActive("/message-board") 
            ? cn(
                "bg-white/20 text-white",
                "dark:bg-gray-700 dark:text-white"
              ) 
            : ""
        )}
        aria-label="Message Board"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
      <ThemeToggle size={size} />
    </div>
  );
};

export default NavActions;
