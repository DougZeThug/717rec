import { ChevronDown, ListChecks, Menu, Timer } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

import AdminSectionList from './AdminSectionList';
import { findAdminSection } from './adminSections';

interface AdminMobileNavProps {
  /** Section named by the address. */
  activeTab: string;
  onTabChange: (tabId: string) => void;
  pendingRequestsCount?: number;
}

/**
 * The phone menu: one bar, and the full section list behind it in a drawer.
 *
 * The search box, the six groups and the quick-access buttons all used to sit
 * above the section, so every section started about 660 pixels down and a
 * league-night task began with a full-screen scroll (UX audit X-06). Only the
 * bar is on the page now.
 *
 * The bar is deliberately **not** sticky, though the finding suggested it: the
 * site header is already `sticky top-0`, so a second sticky bar slides
 * underneath it. The finding is about the first screen, which one short bar
 * fixes on its own.
 */
const AdminMobileNav: React.FC<AdminMobileNavProps> = ({
  activeTab,
  onTabChange,
  pendingRequestsCount = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeLabel = findAdminSection(activeTab)?.label ?? 'Sections';

  const handleTabSelect = (tabId: string) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {/* Names the section as well as opening the menu, so the bar answers
            "where am I?" without costing a second row. */}
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className="flex-1 h-11 justify-start gap-2 min-w-0"
        >
          <Menu className="size-4 shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">Sections</span>
          <span className="truncate font-medium">{activeLabel}</span>
          <ChevronDown className="size-4 shrink-0 ml-auto text-muted-foreground" />
        </Button>
      </div>

      {/* Quick Access stays on the page: these are the two league-night jobs. */}
      <div className="pb-3 border-b border-border">
        <p className="text-xs text-muted-foreground mb-2 px-1 font-medium uppercase tracking-wide">
          Quick Access
        </p>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'scores' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTabSelect('scores')}
            className="flex-1 h-10"
          >
            <ListChecks className="size-4 mr-2" />
            Scores
          </Button>
          <Button
            variant={activeTab === 'timeslots' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTabSelect('timeslots')}
            className="flex-1 h-10"
          >
            <Timer className="size-4 mr-2" />
            Timeslots
          </Button>
        </div>
      </div>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>Admin sections</DrawerTitle>
            <DrawerDescription>Choose a section to open.</DrawerDescription>
          </DrawerHeader>
          {/* Twenty-one sections and six group headings do not fit a phone. */}
          <div className="overflow-y-auto px-4 pb-6">
            <AdminSectionList
              activeTab={activeTab}
              onTabChange={handleTabSelect}
              pendingRequestsCount={pendingRequestsCount}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default React.memo(AdminMobileNav);
