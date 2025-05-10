
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Grid2x2, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { gradients } from "@/styles/design-system";

interface ViewToggleProps {
  view: "division" | "all";
  onViewChange: (view: "division" | "all") => void;
}

const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  return (
    <ToggleGroup 
      type="single" 
      value={view} 
      onValueChange={(value) => value && onViewChange(value as "division" | "all")}
      className="bg-gradient-to-br from-gray-100 to-blue-50/50 dark:from-gray-800/80 dark:to-gray-900 dark:border dark:border-gray-700 p-0.5 rounded-md shadow-sm"
    >
      <ToggleGroupItem 
        value="division" 
        aria-label="View by Division"
        className={cn(
          "transition-all duration-200",
          view === "division" ? 
            "bg-gradient-to-br from-blue-600 to-blue-700 text-white dark:from-blue-600 dark:to-blue-800 dark:text-white dark:border dark:border-blue-500" : 
            "hover:bg-gradient-to-br hover:from-blue-50 hover:to-orange-50/30 dark:hover:from-gray-700 dark:hover:to-gray-800 dark:text-gray-300 dark:hover:text-white"
        )}
      >
        <Grid2x2 className="h-4 w-4 mr-2" />
        By Division
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="all" 
        aria-label="View All Teams"
        className={cn(
          "transition-all duration-200",
          view === "all" ? 
            "bg-gradient-to-br from-blue-600 to-amber-600 text-white dark:from-blue-600 dark:to-amber-700 dark:text-white dark:border dark:border-blue-500" : 
            "hover:bg-gradient-to-br hover:from-blue-50 hover:to-orange-50/30 dark:hover:from-gray-700 dark:hover:to-gray-800 dark:text-gray-300 dark:hover:text-white"
        )}
      >
        <List className="h-4 w-4 mr-2" />
        All Teams
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ViewToggle;
