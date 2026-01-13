import { LogIn, LogOut, Settings, Shield, User } from 'lucide-react';
import React, { useCallback } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useTeamMembership } from '@/hooks/useTeamMembership';

interface UserMenuProps {
  className?: string;
}

const UserMenu: React.FC<UserMenuProps> = React.memo(({ className }) => {
  const { user, profile, signOut } = useAuth();
  const { membership, isFetching } = useTeamMembership();
  const { isAdminAccessGranted } = useAdminAccess();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  // Close dropdown when clicking a menu item
  const handleMenuItemClick = useCallback(() => {
    setOpen(false);
  }, []);

  // Memoize handlers to prevent recreating on each render
  const handleLoginClick = useCallback(() => {
    navigate('/auth');
  }, [navigate]);

  const handleSignOut = useCallback(() => {
    signOut();
  }, [signOut]);

  if (!user) {
    return (
      <div className="flex items-center">
        <Button
          variant="secondary"
          size="sm"
          className="whitespace-nowrap !flex !items-center px-2"
          onClick={handleLoginClick}
        >
          <LogIn className="h-4 w-4 mr-1" />
          <span className="!block">Login</span>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative text-base font-normal p-1"
          size="sm"
          aria-label="User menu"
        >
          <User className="h-4 w-4 mr-1" />
          {profile?.username || 'User'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{profile?.username || 'User'}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <DropdownMenuSeparator />

        {isAdminAccessGranted && (
          <>
            <DropdownMenuItem asChild onSelect={handleMenuItemClick}>
              <Link to="/admin" className="cursor-pointer flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Admin Panel
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {membership && membership.team ? (
          <DropdownMenuItem asChild onSelect={handleMenuItemClick}>
            <Link to={`/teams/${membership.team_id}`} className="cursor-pointer flex items-center">
              <User className="w-4 h-4 mr-2" />
              My Team
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild onSelect={handleMenuItemClick}>
            <Link to="/my-team" className="cursor-pointer flex items-center">
              <User className="w-4 h-4 mr-2" />
              Join a Team
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild onSelect={handleMenuItemClick}>
          <Link to="/message-board" className="cursor-pointer flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Message Board
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild onSelect={handleMenuItemClick}>
          <Link to="/setup-profile" className="cursor-pointer flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Edit Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

UserMenu.displayName = 'UserMenu';

export default UserMenu;
