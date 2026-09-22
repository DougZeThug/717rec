import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogIn, LogOut, Settings, Shield, User } from 'lucide-react';
import React, { useCallback } from 'react';
import { Link, MemoryRouter, useLocation, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseTeamMembership = vi.hoisted(() => vi.fn());
const mockUseAdminAccess = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => mockUseTeamMembership(),
}));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockUseAdminAccess() }));

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

const UserMenuNoMemo: React.FC = () => {
  const { user, profile, signOut } = mockUseAuth();
  const { activeMembership: membership } = mockUseTeamMembership();
  const { isAdminAccessGranted } = mockUseAdminAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const handleMenuItemClick = useCallback(() => setOpen(false), []);

  if (!user) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="whitespace-nowrap !flex !items-center px-2"
        onClick={() => navigate('/auth')}
      >
        <LogIn className="size-4 mr-1" />
        <span className="!block">Login</span>
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative text-base font-normal p-1" size="sm" aria-label="User menu">
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
            <DropdownMenuItem asChild onSelect={handleMenuItemClick}>
              <Link to="/admin" className="cursor-pointer flex items-center">
                <Shield className="size-4 mr-2" />
                Admin Panel
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild onSelect={handleMenuItemClick}>
          <Link to="/my-team" className="cursor-pointer flex items-center">
            <User className="size-4 mr-2" />
            {membership?.team ? 'My Team' : 'Join a Team'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild onSelect={handleMenuItemClick}>
          <Link to="/message-board" className="cursor-pointer flex items-center">
            <Settings className="size-4 mr-2" />
            Message Board
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild onSelect={handleMenuItemClick}>
          <Link to="/setup-profile" className="cursor-pointer flex items-center">
            <Settings className="size-4 mr-2" />
            Edit Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="size-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

describe('UserMenu no memo', () => {
  it('test 1', async () => {
    const u = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      profile: { username: 'doug' },
      signOut: vi.fn(),
    });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
    mockUseTeamMembership.mockReturnValue({ activeMembership: null });

    render(
      <MemoryRouter initialEntries={['/']}>
        <UserMenuNoMemo />
        <LocationProbe />
      </MemoryRouter>
    );

    await u.click(screen.getByRole('button', { name: /user menu/i }));
    expect(await screen.findByRole('menuitem', { name: /join a team/i })).toBeInTheDocument();
  });

  it('test 2', async () => {
    const u = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      profile: { username: 'doug' },
      signOut: vi.fn(),
    });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
    mockUseTeamMembership.mockReturnValue({ activeMembership: null });

    render(
      <MemoryRouter initialEntries={['/']}>
        <UserMenuNoMemo />
        <LocationProbe />
      </MemoryRouter>
    );

    await u.click(screen.getByRole('button', { name: /user menu/i }));
    expect(await screen.findByRole('menuitem', { name: /join a team/i })).toBeInTheDocument();
  });
});
