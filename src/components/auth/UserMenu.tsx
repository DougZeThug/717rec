import { LogIn, LogOut, type LucideIcon, Settings, Shield, User } from 'lucide-react';
import React, { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/auth-context';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import { isAdminConsolePath } from '@/utils/adminPath';
import { confirmDiscardUnsavedWork, confirmLeavingClick } from '@/utils/unsavedChanges';

interface UserMenuProps {
  className?: string;
}

interface MenuLinkItemProps {
  to: string;
  icon: LucideIcon;
  onClick: React.MouseEventHandler<HTMLAnchorElement>;
  onSelect: () => void;
  children: React.ReactNode;
}

/** One link row in the user menu. The Link stays the direct child of the menu item. */
const MenuLinkItem: React.FC<MenuLinkItemProps> = ({
  to,
  icon: Icon,
  onClick,
  onSelect,
  children,
}) => (
  <DropdownMenuItem asChild onSelect={onSelect}>
    <Link to={to} onClick={onClick} className="cursor-pointer flex items-center">
      <Icon className="size-4 mr-2" />
      {children}
    </Link>
  </DropdownMenuItem>
);

const UserMenu: React.FC<UserMenuProps> = React.memo(({ className: _className }) => {
  const { user, profile, signOut } = useAuth();
  const { activeMembership: membership } = useTeamMembership();
  const { isAdminAccessGranted } = useAdminAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  // Close dropdown when clicking a menu item
  const handleMenuItemClick = useCallback(() => {
    setOpen(false);
  }, []);

  // Inside the console this link has nowhere to go: `/admin` reopens the
  // section already on screen, and the redirect unmounts it on the way, taking
  // any unsaved work with it. Close the menu and stay put. See
  // `isAdminConsolePath`.
  const handleAdminLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (isAdminConsolePath(location.pathname)) {
        event.preventDefault();
        return;
      }
      confirmLeavingClick(event);
    },
    [location.pathname]
  );

  // Memoize handlers to prevent recreating on each render
  const handleLoginClick = useCallback(() => {
    navigate('/auth', {
      state: { returnTo: `${location.pathname}${location.search}${location.hash}` },
    });
  }, [navigate, location.pathname, location.search, location.hash]);

  // Signing out jumps to the home page in-app, so it loses unsaved admin work
  // exactly like any link here does — the browser never gets a chance to ask.
  const handleSignOut = useCallback(() => {
    if (!confirmDiscardUnsavedWork()) return;
    signOut();
  }, [signOut]);

  if (!user) {
    return (
      <div className="flex items-center">
        <Button
          variant="secondary"
          size="sm"
          className="whitespace-nowrap flex! items-center! px-2"
          onClick={handleLoginClick}
        >
          <LogIn className="size-4 mr-1" />
          <span className="block!">Sign in</span>
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
          <User className="size-4 mr-1" />
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
            <MenuLinkItem
              to="/admin"
              icon={Shield}
              onClick={handleAdminLinkClick}
              onSelect={handleMenuItemClick}
            >
              Admin Panel
            </MenuLinkItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Always /my-team: it is the only page with Leave Team and the team
            edit control, so a member must be able to reach it. */}
        <MenuLinkItem
          to="/my-team"
          icon={User}
          onClick={confirmLeavingClick}
          onSelect={handleMenuItemClick}
        >
          {membership?.team ? 'My Team' : 'Join a Team'}
        </MenuLinkItem>

        <MenuLinkItem
          to="/message-board"
          icon={Settings}
          onClick={confirmLeavingClick}
          onSelect={handleMenuItemClick}
        >
          Message Board
        </MenuLinkItem>

        <MenuLinkItem
          to="/setup-profile"
          icon={Settings}
          onClick={confirmLeavingClick}
          onSelect={handleMenuItemClick}
        >
          Edit Profile
        </MenuLinkItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-destructive-text focus:text-destructive-text"
        >
          <LogOut className="size-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

UserMenu.displayName = 'UserMenu';

export default UserMenu;
