import React, { useState } from "react";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import WinLossChartCard from "./WinLossChartCard";
import PowerScoreChartCard from "./PowerScoreChartCard";
import PowerScoreTrendsCard from "./PowerScoreTrendsCard";
import { useChartData } from "./hooks/useChartData";
import { ChartBar, ChartPie, TrendingUp, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations, gradients } from "@/styles/design-system";
import { useTheme } from "next-themes";

interface StatsChartsProps {
  rankings: Ranking[];
  chartLimit: number;
}

type ChartType = "winLoss" | "powerScore" | "trends";

const StatsCharts = ({ rankings, chartLimit }: StatsChartsProps) => {
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { winLossData, powerScoreData } = useChartData(rankings, chartLimit);
  const [activeChart, setActiveChart] = useState<ChartType>("winLoss");
  const [isOpen, setIsOpen] = useState(false);

  const toggleChart = () => {
    setActiveChart(prev => {
      if (prev === "winLoss") return "powerScore";
      if (prev === "powerScore") return "trends";
      return "winLoss";
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <Card className={cn(
        "border-t-2 border-blue-300 dark:border-blue-700/80",
        "shadow-lg hover:shadow-xl transition-shadow duration-300",
        isLight ? gradients.card.blueOrange : ""
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className={cn(
            isMobile ? "py-2.5 px-3" : "py-4",
            isLight ? "bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30" : "bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-900/80",
            "border-b border-blue-100 dark:border-blue-900/30 rounded-t-lg cursor-pointer hover:bg-muted/50 transition-colors"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle 
                  className={cn(
                    "font-bebas uppercase tracking-wide",
                    isMobile ? "text-lg" : "text-xl sm:text-2xl",
                    "bg-gradient-to-br from-blue-800 via-blue-700 to-amber-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-400"
                  )}
                  style={{ letterSpacing: "0.5px" }}
                >
                  Performance Charts
                </CardTitle>
                {!isMobile && (
                  <CardDescription className={cn(
                    isLight ? "!text-[#444444] !font-medium font-inter" : "text-gray-400 font-inter"
                  )}>
                    Visual breakdown of team performance metrics
                  </CardDescription>
                )}
              </div>
              <ChevronDown 
                className={cn(
                  "h-5 w-5 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 font-inter">
              {/* On mobile: cycle between win-loss, power score, and trends */}
              {isMobile ? (
                <div className="relative">
                  <div className="absolute top-3 right-3 z-10">
                    <button 
                      onClick={toggleChart}
                      className="bg-white dark:bg-gray-800 shadow-md rounded-full p-1.5 flex items-center gap-1 border border-gray-200 dark:border-gray-700"
                    >
                      {activeChart === "winLoss" ? (
                        <>
                          <ChartBar className="h-4 w-4 text-blue-600" />
                          <ChartPie className="h-4 w-4 text-gray-400" />
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <ChevronsRight className="h-3.5 w-3.5 text-gray-600" />
                        </>
                      ) : activeChart === "powerScore" ? (
                        <>
                          <ChartBar className="h-4 w-4 text-gray-400" />
                          <ChartPie className="h-4 w-4 text-purple-600" />
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <ChevronsRight className="h-3.5 w-3.5 text-gray-600" />
                        </>
                      ) : (
                        <>
                          <ChartBar className="h-4 w-4 text-gray-400" />
                          <ChartPie className="h-4 w-4 text-gray-400" />
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <ChevronsRight className="h-3.5 w-3.5 text-gray-600" />
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className={cn(
                    "transition-all duration-300",
                    activeChart !== "winLoss" && "hidden"
                  )}>
                    <WinLossChartCard 
                      data={winLossData} 
                      chartLimit={chartLimit} 
                      isMobile={isMobile} 
                    />
                  </div>
                  
                  <div className={cn(
                    "transition-all duration-300",
                    activeChart !== "powerScore" && "hidden",
                    animations.fadeIn
                  )}>
                    <PowerScoreChartCard data={powerScoreData} />
                  </div>
                  
                  <div className={cn(
                    "transition-all duration-300",
                    activeChart !== "trends" && "hidden",
                    animations.fadeIn
                  )}>
                    <PowerScoreTrendsCard />
                  </div>
                </div>
              ) : (
                // On desktop: show all three charts in a row
                <>
                  <WinLossChartCard 
                    data={winLossData} 
                    chartLimit={chartLimit} 
                    isMobile={isMobile} 
                  />
                  
                  <PowerScoreChartCard data={powerScoreData} />
                  
                  <PowerScoreTrendsCard />
                </>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default StatsCharts;
