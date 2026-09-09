import { ChevronDown, Search, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import {
  ADMIN_SECTION_GROUPS,
  ADMIN_SECTIONS,
  type AdminSectionGroup,
  findAdminSection,
  findAdminSectionGroup,
} from './adminSections';

interface AdminSectionListProps {
  /** Section named by the address. */
  activeTab: string;
  onTabChange: (tabId: string) => void;
  pendingRequestsCount?: number;
}

/**
 * The searchable, grouped list of all twenty-one sections.
 *
 * Split out of `AdminMobileNav` when the phone menu moved into a drawer: the
 * nav is now a small bar and this is what the drawer holds.
 */
const AdminSectionList: React.FC<AdminSectionListProps> = ({
  activeTab,
  onTabChange,
  pendingRequestsCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const activeGroupId = findAdminSectionGroup(activeTab)?.id;

  const [openGroups, setOpenGroups] = useState<Set<string>>(() =>
    activeGroupId ? new Set([activeGroupId]) : new Set<string>()
  );

  // Follow the open section. This used to be worked out on the first render
  // only, so arriving in Live Corrections from a League Night quick action left
  // the menu showing the wrong group open and nothing highlighted (UX audit
  // A-01). It only ever adds, so groups the admin opened by hand stay open, and
  // closing the open section's group by hand still works — nothing reopens it
  // until the section changes again.
  useEffect(() => {
    if (!activeGroupId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync menu state from the section in the address
    setOpenGroups((prev) => (prev.has(activeGroupId) ? prev : new Set(prev).add(activeGroupId)));
  }, [activeGroupId]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const getGroupBadgeCount = (group: AdminSectionGroup): number => {
    if (group.sections.includes('requests') && pendingRequestsCount > 0) {
      return pendingRequestsCount;
    }
    return 0;
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return [];
    return ADMIN_SECTIONS.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleTabSelect = (tabId: string) => {
    onTabChange(tabId);
    setSearchQuery('');
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search admin sections..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9 h-10"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Named to match the sidebar, so the section list is a landmark on
          a phone too rather than a bare stack of buttons. */}
      <nav aria-label="Admin sections">
        {/* Search Results (flat list) */}
        {searchQuery ? (
          <div className="space-y-1">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sections found</p>
            ) : (
              filteredItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    activeTab === item.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground'
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === 'requests' && pendingRequestsCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {pendingRequestsCount}
                    </Badge>
                  )}
                </button>
              ))
            )}
          </div>
        ) : (
          /* Grouped Accordion Navigation */
          <div className="space-y-3">
            {ADMIN_SECTION_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              const groupBadge = getGroupBadgeCount(group);
              const isOpen = openGroups.has(group.id);

              return (
                <div key={group.id} className="border border-border rounded-lg">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-muted/30 rounded-t-lg"
                  >
                    <GroupIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-left font-medium text-sm">{group.label}</span>
                    {groupBadge > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {groupBadge}
                      </Badge>
                    )}
                    <ChevronDown
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-border">
                      {group.sections.map((tabId) => {
                        const tab = findAdminSection(tabId);
                        if (!tab) return null;
                        const TabIcon = tab.icon;

                        return (
                          <button
                            type="button"
                            key={tabId}
                            onClick={() => handleTabSelect(tabId)}
                            aria-current={activeTab === tabId ? 'page' : undefined}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                              'hover:bg-accent hover:text-accent-foreground',
                              'border-b border-border last:border-b-0',
                              activeTab === tabId
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground'
                            )}
                          >
                            <TabIcon className="size-4 shrink-0" />
                            <span className="flex-1 text-left">{tab.label}</span>
                            {tabId === 'requests' && pendingRequestsCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {pendingRequestsCount}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>
    </div>
  );
};

export default AdminSectionList;
