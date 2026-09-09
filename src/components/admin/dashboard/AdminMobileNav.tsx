import { ChevronDown, ListChecks, Search, Timer, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import {
  ADMIN_SECTION_GROUPS,
  ADMIN_SECTIONS,
  type AdminSectionGroup,
  findAdminSection,
} from './adminSections';

interface AdminMobileNavProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  pendingRequestsCount?: number;
}

const AdminMobileNav: React.FC<AdminMobileNavProps> = ({
  activeTab,
  onTabChange,
  pendingRequestsCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-open the group containing the active tab
  const initialOpen = useMemo(() => {
    const group = ADMIN_SECTION_GROUPS.find((g) => g.sections.includes(activeTab));
    return group ? new Set([group.id]) : new Set<string>();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeTab intentionally excluded to keep nav memo stable
  }, []);
  const [openGroups, setOpenGroups] = useState<Set<string>>(initialOpen);

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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Quick Access */}
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

            return (
              <div key={group.id} className="border border-border rounded-lg">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
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
                      openGroups.has(group.id) && 'rotate-180'
                    )}
                  />
                </button>
                {openGroups.has(group.id) && (
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
    </div>
  );
};

export default React.memo(AdminMobileNav);
