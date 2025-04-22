
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
    className="bg-muted rounded-md p-1"
    aria-label="Display Mode"
  >
    <ToggleGroupItem
      value="all"
      aria-label="Show All Teams"
      className={displayMode === "all" ? "bg-primary text-primary-foreground" : ""}
    >
      <List size={16} className="mr-1" />
      All Teams
    </ToggleGroupItem>
    <ToggleGroupItem
      value="grouped"
      aria-label="Group By Division"
      className={displayMode === "grouped" ? "bg-primary text-primary-foreground" : ""}
    >
      <Users size={16} className="mr-1" />
      Grouped by Division
    </ToggleGroupItem>
  </ToggleGroup>
);

export default TeamsDisplayModeToggle;
