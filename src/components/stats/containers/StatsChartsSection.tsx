
import React from "react";
import { Ranking } from "@/types";
import StatsCharts from "../StatsCharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface StatsChartsSectionProps {
  rankings: Ranking[];
}

const StatsChartsSection = ({ rankings }: StatsChartsSectionProps) => {
  const isMobile = useIsMobile();
  const chartLimit = isMobile ? 5 : 8;
  
  return (
    <div className="mb-4">
      <StatsCharts rankings={rankings} chartLimit={chartLimit} />
    </div>
  );
};

export default StatsChartsSection;
