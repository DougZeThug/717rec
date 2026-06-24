import * as React from 'react';

import { cn } from '@/lib/utils';

import { useSidebar } from './sidebar-context';
import { SidebarDesktop } from './sidebar-desktop';
import { SidebarMobile } from './sidebar-mobile';

// Re-export components so existing imports from '@/components/ui/sidebar' keep working.
// Non-component exports (constants, contexts, hooks) live in their own modules
// to satisfy react-refresh/only-export-components for this barrel file.
export { SidebarProvider } from './sidebar-provider';
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
