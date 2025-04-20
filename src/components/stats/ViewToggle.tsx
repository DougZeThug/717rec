
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Grid2x2, List } from "lucide-react";

interface ViewToggleProps {
  view: "division" | "all";
  onViewChange: (view: "division" | "all") => void;
}

const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  return (
    <ToggleGroup type="single" value={view} onValueChange={(value) => value && onViewChange(value as "division" | "all")}>
      <ToggleGroupItem value="division" aria-label="View by Division">
        <Grid2x2 className="h-4 w-4 mr-2" />
        By Division
      </ToggleGroupItem>
      <ToggleGroupItem value="all" aria-label="View All Teams">
        <List className="h-4 w-4 mr-2" />
        All Teams
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ViewToggle;
