
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Users, List } from "lucide-react";
import { DisplayMode } from "./TeamsPageContainer";
import { cn } from "@/lib/utils";

interface TeamsDisplayModeToggleProps {
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
}

const TeamsDisplayModeToggle: React.FC<TeamsDisplayModeToggleProps> = ({ displayMode, setDisplayMode }) => (
  <ToggleGroup
    type="single"
    value={displayMode}
    onValueChange={val => setDisplayMode((val as DisplayMode) || "all")}
    className="bg-muted dark:bg-gray-800/80 dark:border dark:border-gray-700 rounded-md p-0.5 shadow-sm"
    aria-label="Display Mode"
  >
    <ToggleGroupItem
      value="all"
      aria-label="Show All Teams"
      className={cn(
        "px-2 py-1 text-sm rounded-md transition-all duration-200",
        displayMode === "all" 
          ? "bg-primary text-primary-foreground dark:bg-blue-700 dark:text-white dark:border dark:border-blue-600" 
          : "dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
      )}
    >
      <List size={16} className="mr-1" />
      All
    </ToggleGroupItem>
    <ToggleGroupItem
      value="grouped"
      aria-label="Group By Division"
      className={cn(
        "px-2 py-1 text-sm rounded-md transition-all duration-200",
        displayMode === "grouped" 
          ? "bg-primary text-primary-foreground dark:bg-blue-700 dark:text-white dark:border dark:border-blue-600"
          : "dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
      )}
    >
      <Users size={16} className="mr-1" />
      Grouped
    </ToggleGroupItem>
  </ToggleGroup>
);

export default TeamsDisplayModeToggle;
