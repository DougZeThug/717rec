
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Grid2x2, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface ViewToggleProps {
  view: "division" | "all";
  onViewChange: (view: "division" | "all") => void;
}

const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  return (
    <ToggleGroup 
      type="single" 
      value={view} 
      onValueChange={(value) => value && onViewChange(value as "division" | "all")}
      className="bg-muted dark:bg-gray-800/60 dark:border dark:border-gray-700 p-0.5 rounded-md shadow-sm"
    >
      <ToggleGroupItem 
        value="division" 
        aria-label="View by Division"
        className={cn(
          view === "division" ? 
            (isDark ? "bg-blue-600 text-white border border-blue-500" : "bg-primary text-primary-foreground") : 
            (isDark ? "text-gray-300 hover:text-white hover:bg-gray-700/70" : "")
        )}
      >
        <Grid2x2 className="h-4 w-4 mr-2" />
        By Division
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="all" 
        aria-label="View All Teams"
        className={cn(
          view === "all" ? 
            (isDark ? "bg-blue-600 text-white border border-blue-500" : "bg-primary text-primary-foreground") : 
            (isDark ? "text-gray-300 hover:text-white hover:bg-gray-700/70" : "")
        )}
      >
        <List className="h-4 w-4 mr-2" />
        All Teams
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ViewToggle;
