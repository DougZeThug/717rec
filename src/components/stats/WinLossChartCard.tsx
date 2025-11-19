
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useTheme } from "next-themes";
import WinLossChart from "./WinLossChart";
import { ChartDataItem } from "@/types/chart";

interface WinLossChartCardProps {
  data: ChartDataItem[];
  chartLimit: number;
  isMobile: boolean;
}

const WinLossChartCard: React.FC<WinLossChartCardProps> = ({ 
  data, 
  chartLimit, 
  isMobile 
}) => {
  const { resolvedTheme } = useTheme();

  return (
    <Card className={`bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#20232A] dark:border-0 dark:text-white rounded-xl shadow-sm`}>
      <CardHeader className="pb-1.5 rounded-t-xl"
        style={resolvedTheme === "light" ? { borderBottom: "1px solid #e0e0e0", borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "#fff" } : {}}>
        <CardTitle
          className="text-lg sm:text-xl font-semibold font-inter tracking-wide text-gray-800 dark:text-white uppercase"
          style={{ letterSpacing: ".03em" }}
        >
          Win-Loss Records
        </CardTitle>
        <CardDescription
          className="text-sm text-gray-600 dark:text-gray-300 font-inter"
        >
          Top {chartLimit} teams by win percentage
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <WinLossChart data={data} chartLimit={chartLimit} isMobile={isMobile} />
      </CardContent>
    </Card>
  );
};

export default WinLossChartCard;
