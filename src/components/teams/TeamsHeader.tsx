
import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface TeamsHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TeamsHeader: React.FC<TeamsHeaderProps> = ({ 
  onRefresh,
  isRefreshing 
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Teams</h1>
      <div className="flex flex-wrap gap-2">
        <Button 
          onClick={onRefresh} 
          variant="outline"
          disabled={isRefreshing}
          className="flex items-center gap-2"
          size={isMobile ? "sm" : "default"}
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> 
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
    </div>
  );
};
