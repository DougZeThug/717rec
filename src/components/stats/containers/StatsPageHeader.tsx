
import React from "react";
import PageHeader from "@/components/layout/PageHeader";
import { animations } from "@/styles/design-system";
import { cn } from "@/lib/utils";

const StatsPageHeader = () => {
  return (
    <PageHeader 
      title="Standings" 
      description="Current season rankings and performance metrics"
      className={cn("mt-1", animations.fadeInSlideDown)} 
      withGradient={true}
    />
  );
};

export default StatsPageHeader;
