
import React from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import ThemeToggle from "@/components/ui/theme/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/contexts/NavigationContext";

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
    <div className={cn("flex items-center gap-3", className)}>
      <UserMenu />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleMessageBoardClick}
        className={cn(
          "rounded-full text-white hover:bg-cornhole-navy-light dark:hover:bg-gray-700/80",
          isActive("/message-board") && "bg-cornhole-navy-light dark:bg-gray-700"
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
