
import React, { useState } from "react";
import {
  Users,
  Users2,
  Clock,
  Calendar,
  ListChecks,
  Sparkles,
  CalendarClock,
  Timer,
  LayoutGrid,
  Search,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  HelpCircle,
  ClipboardCheck,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

import TeamManagementTab from "@/components/admin/teams/TeamManagementTab";
import PendingMatchesSection from "@/components/admin/PendingMatchesSection";
import TimeslotsTab from "@/components/admin/timeslots/TimeslotsTab";
import BatchMatchCreationTab from "@/components/admin/batch-matches/BatchMatchCreationTab";
import MassScoresTab from "@/components/admin/scores/MassScoresTab";
import AutoScheduleTab from "@/components/admin/auto-schedule/AutoScheduleTab";
import SeasonManagementTab from "@/components/admin/seasons/SeasonManagementTab";
import HeroCardsTab from "@/components/admin/hero-cards/HeroCardsTab";
import BlindDrawSignupsTab from "@/components/admin/blind-draw/BlindDrawSignupsTab";
import OpponentHistoryTab from "@/components/admin/opponent-history/OpponentHistoryTab";
import GettingStartedTab from "@/components/admin/help/GettingStartedTab";
import SeasonParticipationTab from "@/components/admin/participation/SeasonParticipationTab";
import RequestsTab from "@/components/admin/requests/RequestsTab";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePendingRequestsCount } from "@/hooks/useTeamRequests";
import AdminMobileNav from "./AdminMobileNav";

interface AdminMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.ReactNode;
}

const adminMenuItems: AdminMenuItem[] = [
  { id: "timeslots", label: "Timeslots", icon: Timer, component: <TimeslotsTab /> },
  { id: "batch-matches", label: "Match Creation", icon: Sparkles, component: <BatchMatchCreationTab /> },
  { id: "auto-schedule", label: "Auto Schedule", icon: CalendarClock, component: <AutoScheduleTab /> },
  { id: "matchups", label: "Matchups", icon: Users2, component: <OpponentHistoryTab /> },
  { id: "scores", label: "Scores", icon: ListChecks, component: <MassScoresTab /> },
  { id: "seasons", label: "Season", icon: Calendar, component: <SeasonManagementTab /> },
  { id: "participation", label: "Participation", icon: ClipboardCheck, component: <SeasonParticipationTab /> },
  { id: "requests", label: "Requests", icon: Inbox, component: <RequestsTab /> },
  { id: "teams", label: "Teams", icon: Users, component: <TeamManagementTab /> },
  { id: "pending-matches", label: "Pending", icon: Clock, component: <PendingMatchesSection /> },
  { id: "hero-cards", label: "Hero", icon: LayoutGrid, component: <HeroCardsTab /> },
  { id: "blind-draw", label: "Blind Draw", icon: Shuffle, component: <BlindDrawSignupsTab /> },
  { id: "help", label: "Help", icon: HelpCircle, component: <GettingStartedTab /> },
];

const STORAGE_KEY = "adminActiveTab";

const AdminSidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const { data: pendingRequestsCount } = usePendingRequestsCount();
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEY) || "timeslots";
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    sessionStorage.setItem(STORAGE_KEY, tabId);
  };
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = adminMenuItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeItem = adminMenuItems.find((item) => item.id === activeTab);

  // Mobile: Use grouped collapsible navigation
  if (isMobile) {
    return (
      <div className="space-y-4">
        <AdminMobileNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingRequestsCount={pendingRequestsCount}
        />
        
        {/* Content - render active tab */}
        {adminMenuItems.map((item) => (
          <div
            key={item.id}
            className={cn(activeTab === item.id ? "block" : "hidden")}
          >
            {item.component}
          </div>
        ))}
      </div>
    );
  }

  // Desktop: Use sidebar
  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 60 : 240 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "flex flex-col bg-card border border-border rounded-lg overflow-hidden",
          "shrink-0"
        )}
      >
        {/* Header with collapse toggle */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-semibold text-sm"
            >
              Admin Menu
            </motion.span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 border-b border-border"
            >
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu items */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  "min-h-[44px]", // Touch target
                  activeTab === item.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <>
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="truncate flex-1 text-left"
                      >
                        {item.label}
                      </motion.span>
                      {item.id === "requests" && pendingRequestsCount !== undefined && pendingRequestsCount > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                          {pendingRequestsCount}
                        </Badge>
                      )}
                    </>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </nav>
        </ScrollArea>
      </motion.aside>

      {/* Content area - all tabs stay mounted to preserve state */}
      <div className="flex-1 min-w-0">
        {adminMenuItems.map((item) => (
          <div
            key={item.id}
            className={cn(activeTab === item.id ? "block" : "hidden")}
          >
            {item.component}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSidebar;
