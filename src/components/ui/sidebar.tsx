import * as React from 'react';

import { cn } from '@/lib/utils';

import { useSidebar } from './sidebar-context';
import { SidebarDesktop } from './sidebar-desktop';
import { SidebarMobile } from './sidebar-mobile';

// Re-export everything so existing imports from '@/components/ui/sidebar' keep working.
export {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_WIDTH_MOBILE,
  SidebarContext,
  SidebarProvider,
  useSidebar,
} from './sidebar-context';
export {
  SidebarContent,
  SidebarDesktop,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from './sidebar-desktop';
export {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  sidebarMenuButtonVariants,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from './sidebar-menu';
export { SidebarMobile } from './sidebar-mobile';

// ---------------------------------------------------------------------------
// Sidebar — routes between the mobile drawer and the desktop panel.
// The "collapsible=none" branch is a simple non-collapsible wrapper.
// ---------------------------------------------------------------------------

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    side?: 'left' | 'right';
    variant?: 'sidebar' | 'floating' | 'inset';
    collapsible?: 'offcanvas' | 'icon' | 'none';
  }
>(
  (
    {
      side = 'left',
      variant = 'sidebar',
      collapsible = 'offcanvas',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (collapsible === 'none') {
      return (
        <div
          className={cn(
            'flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      );
    }

    if (isMobile) {
      return (
        <SidebarMobile side={side} openMobile={openMobile} setOpenMobile={setOpenMobile}>
          {children}
        </SidebarMobile>
      );
    }

    return (
      <SidebarDesktop
        ref={ref}
        side={side}
        variant={variant}
        collapsible={collapsible}
        state={state}
        className={className}
        {...props}
      >
        {children}
      </SidebarDesktop>
    );
  }
);
Sidebar.displayName = 'Sidebar';

export { Sidebar };
