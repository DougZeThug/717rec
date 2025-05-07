import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useTheme } from "next-themes";
import PowerScoreChart from "./PowerScoreChart";
import { PowerScoreDataItem } from "@/types/chart";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";

interface PowerScoreChartCardProps {
  data: PowerScoreDataItem[];
}

const PowerScoreChartCard: React.FC<PowerScoreChartCardProps> = ({ data }) => {
  const { resolvedTheme } = useTheme();

  return (
    <Card className={cn(
      "bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#20232A] dark:border-0 dark:text-white rounded-xl shadow-sm",
      animations.fadeInSlideUp,
      "animation-delay-200"
    )}>
      <CardHeader className="pb-1.5 rounded-t-xl" 
        style={resolvedTheme === "light" ? { borderBottom: "1px solid #e0e0e0", borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "#fff" } : {}}>
        <CardTitle
          className="text-lg font-semibold font-inter tracking-wide text-gray-800 dark:text-white uppercase"
          style={{ letterSpacing: ".03em" }}
        >
          Top 8 Power Scores
        </CardTitle>
        <CardDescription
          className="text-sm text-gray-600 dark:text-gray-300 font-inter"
        >
          Elite team performance ranking
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <PowerScoreChart data={data} />
      </CardContent>
    </Card>
  );
};

export default PowerScoreChartCard;
