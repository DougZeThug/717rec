
import React, { useState } from "react";
import {
  Users,
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
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import TeamManagementTab from "@/components/admin/teams/TeamManagementTab";
import PendingMatchesSection from "@/components/admin/PendingMatchesSection";
import TimeslotsTab from "@/components/admin/timeslots/TimeslotsTab";
import BatchMatchCreationTab from "@/components/admin/batch-matches/BatchMatchCreationTab";
import MassScoresTab from "@/components/admin/scores/MassScoresTab";
import AutoScheduleTab from "@/components/admin/auto-schedule/AutoScheduleTab";
import SeasonManagementTab from "@/components/admin/seasons/SeasonManagementTab";
import HeroCardsTab from "@/components/admin/hero-cards/HeroCardsTab";
import { useIsMobile } from "@/hooks/use-mobile";

// Mobile tabs version
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminMenuItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  component: React.ReactNode;
}

const adminMenuItems: AdminMenuItem[] = [
  { id: "teams", label: "Team Management", shortLabel: "Teams", icon: Users, component: <TeamManagementTab /> },
  { id: "pending-matches", label: "Pending Matches", shortLabel: "Pending", icon: Clock, component: <PendingMatchesSection /> },
  { id: "seasons", label: "Season Management", shortLabel: "Seasons", icon: Calendar, component: <SeasonManagementTab /> },
  { id: "scores", label: "Mass Scores", shortLabel: "Scores", icon: ListChecks, component: <MassScoresTab /> },
  { id: "batch-matches", label: "Batch Matches", shortLabel: "Batch", icon: Sparkles, component: <BatchMatchCreationTab /> },
  { id: "auto-schedule", label: "Auto Schedule", shortLabel: "Auto", icon: CalendarClock, component: <AutoScheduleTab /> },
  { id: "timeslots", label: "Timeslots", shortLabel: "Timeslots", icon: Timer, component: <TimeslotsTab /> },
  { id: "hero-cards", label: "Hero Cards", shortLabel: "Hero", icon: LayoutGrid, component: <HeroCardsTab /> },
];

const AdminSidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("teams");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = adminMenuItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeItem = adminMenuItems.find((item) => item.id === activeTab);

  // Mobile: Compact dropdown nav
  if (isMobile) {
    const ActiveIcon = activeItem?.icon || Users;
    
    return (
      <div className="space-y-3">
        {/* Compact dropdown nav */}
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex-1 justify-between h-9 px-3">
                <span className="flex items-center gap-2">
                  <ActiveIcon className="h-4 w-4" />
                  <span className="font-medium text-sm">{activeItem?.shortLabel}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {adminMenuItems.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-2",
                    activeTab === item.id && "bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.shortLabel}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeItem?.component}
          </motion.div>
        </AnimatePresence>
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
                onClick={() => setActiveTab(item.id)}
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
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </nav>
        </ScrollArea>
      </motion.aside>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeItem?.component}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminSidebar;
