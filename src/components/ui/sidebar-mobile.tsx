import * as React from 'react';

import { Sheet, SheetContent } from '@/components/ui/sheet';

import { SIDEBAR_WIDTH_MOBILE } from './sidebar-context';

interface SidebarMobileProps {
  side?: 'left' | 'right';
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  children?: React.ReactNode;
}

export function SidebarMobile({
  side = 'left',
  openMobile,
  setOpenMobile,
  children,
}: SidebarMobileProps) {
  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent
        data-sidebar="sidebar"
        data-mobile="true"
        className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
        style={
          {
            '--sidebar-width': SIDEBAR_WIDTH_MOBILE,
          } as React.CSSProperties
        }
        side={side}
      >
        <div className="flex h-full w-full flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
