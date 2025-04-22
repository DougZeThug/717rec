
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Users, List } from "lucide-react";
import { DisplayMode } from "./TeamsPageContainer";

interface TeamsDisplayModeToggleProps {
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
}

const TeamsDisplayModeToggle: React.FC<TeamsDisplayModeToggleProps> = ({ displayMode, setDisplayMode }) => (
  <ToggleGroup
    type="single"
    value={displayMode}
    onValueChange={val => setDisplayMode((val as DisplayMode) || "all")}
    className="bg-muted rounded-md p-0.5"
    aria-label="Display Mode"
  >
    <ToggleGroupItem
      value="all"
      aria-label="Show All Teams"
      className={`px-2 py-1 text-sm rounded-md ${displayMode === "all" ? "bg-primary text-primary-foreground" : ""}`}
    >
      <List size={16} className="mr-1" />
      All
    </ToggleGroupItem>
    <ToggleGroupItem
      value="grouped"
      aria-label="Group By Division"
      className={`px-2 py-1 text-sm rounded-md ${displayMode === "grouped" ? "bg-primary text-primary-foreground" : ""}`}
    >
      <Users size={16} className="mr-1" />
      Grouped
    </ToggleGroupItem>
  </ToggleGroup>
);

export default TeamsDisplayModeToggle;

