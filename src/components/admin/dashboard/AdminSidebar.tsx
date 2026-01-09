
import React, { useState, useEffect } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

// Mobile tabs version
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
const COLLAPSED_STORAGE_KEY = "adminSidebarCollapsed";

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
  
  // Default to expanded on desktop, persist to localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    return stored === "true"; // Default to expanded (false)
  });
  
  // Persist collapse state to localStorage
  useEffect(() => {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = adminMenuItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mobile: Use horizontally scrollable tabs
  if (isMobile) {
    return (
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3">
        <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
          <TabsList className="inline-flex gap-1 h-auto p-1.5 bg-muted/50 w-max min-w-full">
            {adminMenuItems.map((item) => (
              <TabsTrigger 
                key={item.id} 
                value={item.id} 
                className="flex flex-col items-center gap-0.5 py-1.5 px-2.5 text-[10px] uppercase tracking-wide min-h-0 shrink-0 relative"
              >
                <item.icon className="h-4 w-4" />
                <span className="leading-tight text-center whitespace-nowrap">{item.label.split(' ')[0]}</span>
                {item.id === "requests" && pendingRequestsCount !== undefined && pendingRequestsCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 text-[8px] px-1 py-0 min-w-[14px] h-[14px]"
                  >
                    {pendingRequestsCount}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {adminMenuItems.map((item) => (
          <TabsContent key={item.id} value={item.id} className="space-y-3">
            {item.component}
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  // Desktop: Use sidebar with tooltips when collapsed
  return (
    <TooltipProvider delayDuration={100}>
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
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
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
              {filteredItems.map((item) => {
                const isActive = activeTab === item.id;
                const hasBadge = item.id === "requests" && pendingRequestsCount !== undefined && pendingRequestsCount > 0;
                
                const buttonContent = (
                  <button
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all",
                      "hover:bg-accent hover:text-accent-foreground",
                      "min-h-[44px]", // Touch target
                      isCollapsed && "justify-center px-0",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <div className="relative shrink-0">
                      <item.icon className="h-5 w-5" />
                      {/* Badge indicator on icon when collapsed */}
                      {isCollapsed && hasBadge && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                      )}
                    </div>
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
                          {hasBadge && (
                            <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                              {pendingRequestsCount}
                            </Badge>
                          )}
                        </>
                      )}
                    </AnimatePresence>
                  </button>
                );

                // Wrap in tooltip when collapsed
                if (isCollapsed) {
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        {buttonContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        {hasBadge && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            {pendingRequestsCount}
                          </Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <React.Fragment key={item.id}>{buttonContent}</React.Fragment>;
              })}
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
    </TooltipProvider>
  );
};

export default AdminSidebar;
