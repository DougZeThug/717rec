
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useTheme } from "next-themes";
import PowerScoreChart from "./PowerScoreChart";
import { PowerScoreDataItem } from "@/types/chart";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";
import { useIsMobile } from "@/hooks/use-mobile";

interface PowerScoreChartCardProps {
  data: PowerScoreDataItem[];
}

const PowerScoreChartCard: React.FC<PowerScoreChartCardProps> = ({ data }) => {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();

  const headerClasses = isMobile ? "pb-1 pt-2 px-3" : "pb-1.5 rounded-t-xl";
  const titleClasses = isMobile
    ? "text-base font-semibold font-inter tracking-wide text-gray-800 dark:text-white uppercase"
    : "text-lg font-semibold font-inter tracking-wide text-gray-800 dark:text-white uppercase";
  
  const descriptionClasses = isMobile
    ? "text-xs text-gray-600 dark:text-gray-300 font-inter"
    : "text-sm text-gray-600 dark:text-gray-300 font-inter";

  const contentClasses = isMobile ? "p-2 pt-1" : "p-4 pt-2";

  return (
    <Card className={cn(
      "bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#20232A] dark:border-0 dark:text-white rounded-xl shadow-sm",
      animations.fadeInSlideUp,
      "animation-delay-200"
    )}>
      <CardHeader className={headerClasses}
        style={resolvedTheme === "light" ? { borderBottom: "1px solid #e0e0e0", borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "#fff" } : {}}>
        <CardTitle
          className={titleClasses}
          style={{ letterSpacing: ".03em" }}
        >
          Top {isMobile ? "5" : "8"} Power Scores
        </CardTitle>
        <CardDescription
          className={descriptionClasses}
        >
          Elite team performance ranking
        </CardDescription>
      </CardHeader>
      <CardContent className={contentClasses}>
        <PowerScoreChart data={data} />
      </CardContent>
    </Card>
  );
};

export default PowerScoreChartCard;
