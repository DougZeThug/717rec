
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { User, LogOut, Settings, LogIn } from "lucide-react";
import { useTeamMembership } from "@/hooks/useTeamMembership";

interface UserMenuProps {
  className?: string;
}

const UserMenu: React.FC<UserMenuProps> = ({ className }) => {
  const { user, profile, signOut } = useAuth();
  const { membership, isFetching } = useTeamMembership();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex items-center">
        <Button
          variant="secondary"
          size="sm"
          className="bg-cornhole-navy text-white dark:bg-gray-700 hover:bg-cornhole-navy-light dark:hover:bg-gray-600 whitespace-nowrap !flex !items-center"
          onClick={() => navigate("/auth")}
        >
          <LogIn className="h-4 w-4 mr-2" />
          <span className="!block">Login</span>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative text-base font-normal" size="sm">
          <User className="h-4 w-4 mr-2" />
          {profile?.username || "User"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">
            {profile?.username || "User"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        
        {membership && membership.team ? (
          <DropdownMenuItem asChild>
            <Link to={`/teams/${membership.team_id}`} className="cursor-pointer flex items-center">
              <User className="w-4 h-4 mr-2" />
              My Team
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/my-team" className="cursor-pointer flex items-center">
              <User className="w-4 h-4 mr-2" />
              Join a Team
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem asChild>
          <Link to="/message-board" className="cursor-pointer flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Message Board
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/setup-profile" className="cursor-pointer flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Edit Profile
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => signOut()}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
