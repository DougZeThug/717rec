import { AnimatePresence, m } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/useMobile';
import { usePendingRequestsCount } from '@/hooks/useTeamRequests';
import { cn } from '@/lib/utils';
import { ADMIN_TAB_STORAGE_KEY, subscribeToAdminTabRequests } from '@/utils/adminTabs';

import AdminMobileNav from './AdminMobileNav';
import { ADMIN_SECTIONS, DEFAULT_ADMIN_SECTION, findAdminSection } from './adminSections';

// Memoized animation props to prevent recreating objects on every render
const sidebarAnimateProps = { expanded: { width: 240 }, collapsed: { width: 60 } };
const sidebarTransition = { type: 'spring' as const, stiffness: 300, damping: 30 };
const searchAnimateProps = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
};
const labelAnimateProps = {
  initial: { opacity: 0, width: 0 },
  animate: { opacity: 1, width: 'auto' },
  exit: { opacity: 0, width: 0 },
};

/** Admin dashboard shell: searchable section nav (sidebar or mobile) persisting the active tab. */
const AdminSidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const { data: pendingRequestsCount } = usePendingRequestsCount();
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY) || DEFAULT_ADMIN_SECTION;
  });

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, tabId);
  }, []);

  // A control inside one section can ask for another section; see utils/adminTabs.
  useEffect(() => subscribeToAdminTabRequests(handleTabChange), [handleTabChange]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(
    () =>
      ADMIN_SECTIONS.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );

  const activeItem = useMemo(() => findAdminSection(activeTab), [activeTab]);

  // Mobile: Use grouped collapsible navigation
  if (isMobile) {
    const ActiveComponent = activeItem?.Component;

    return (
      <div className="space-y-4">
        <AdminMobileNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingRequestsCount={pendingRequestsCount}
        />

        {/* Content - render only active tab to avoid mounting all components */}
        {ActiveComponent && (
          <Suspense
            fallback={<LoadingState variant="section" message="Loading admin section..." />}
          >
            <ActiveComponent />
          </Suspense>
        )}
      </div>
    );
  }

  // Desktop: Use sidebar
  const ActiveComponent = activeItem?.Component;

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Sidebar */}
      <m.aside
        initial={false}
        animate={isCollapsed ? sidebarAnimateProps.collapsed : sidebarAnimateProps.expanded}
        transition={sidebarTransition}
        className={cn(
          'flex flex-col bg-card border border-border rounded-lg overflow-hidden',
          'shrink-0'
        )}
      >
        {/* Header with collapse toggle */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          {!isCollapsed && (
            <m.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-semibold text-sm"
            >
              Admin Menu
            </m.span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>

        {/* Search */}
        <AnimatePresence>
          {!isCollapsed && (
            <m.div {...searchAnimateProps} className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Menu items */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1" aria-label="Admin sections">
            {filteredItems.map((item) => {
              const showRequestsBadge =
                item.id === 'requests' &&
                pendingRequestsCount !== undefined &&
                pendingRequestsCount > 0;

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  // Collapsing hides the label text, so the button would otherwise
                  // have no accessible name at all. An explicit label also
                  // overrides the badge inside it, so fold the count in rather
                  // than losing it. See UX audit A-02.
                  aria-label={
                    showRequestsBadge
                      ? `${item.label}, ${pendingRequestsCount} pending`
                      : item.label
                  }
                  title={item.label}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                  className={cn(
                    'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all',
                    'hover:bg-accent hover:text-accent-foreground',
                    'min-h-[44px]', // Touch target
                    activeTab === item.id
                      ? 'bg-primary/10 text-primary dark:!text-blue-200 font-medium'
                      : 'text-muted-foreground'
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <m.span {...labelAnimateProps} className="truncate flex-1 text-left">
                        {item.label}
                      </m.span>
                    )}
                  </AnimatePresence>
                  {/* Outside the collapse guard: the pending count is the one piece
                      of live information in this menu and must survive collapsing. */}
                  {showRequestsBadge && (
                    <Badge
                      variant="destructive"
                      aria-hidden="true"
                      className={cn(
                        'text-xs px-1.5 py-0.5 min-w-[20px] h-5',
                        isCollapsed ? 'absolute -top-0.5 right-0.5' : 'ml-auto'
                      )}
                    >
                      {pendingRequestsCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </ScrollArea>
      </m.aside>

      {/* Content area - render only active tab to improve performance */}
      <div className="flex-1 min-w-0">
        {ActiveComponent && (
          <Suspense
            fallback={<LoadingState variant="section" message="Loading admin section..." />}
          >
            <ActiveComponent />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default AdminSidebar;
