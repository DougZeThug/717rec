
import React, { useState } from "react";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import WinLossChartCard from "./WinLossChartCard";
import PowerScoreChartCard from "./PowerScoreChartCard";
import { useChartData } from "./hooks/useChartData";
import { ChartBar, ChartPie, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";

interface StatsChartsProps {
  rankings: Ranking[];
  chartLimit: number;
}

type ChartType = "winLoss" | "powerScore";

const StatsCharts = ({ rankings, chartLimit }: StatsChartsProps) => {
  const isMobile = useIsMobile();
  const { winLossData, powerScoreData } = useChartData(rankings, chartLimit);
  const [activeChart, setActiveChart] = useState<ChartType>("winLoss");
  const [isOpen, setIsOpen] = useState(true); // Start uncollapsed

  // Function to toggle between chart types on mobile
  const toggleChart = () => {
    setActiveChart(prev => prev === "winLoss" ? "powerScore" : "winLoss");
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-inter text-lg sm:text-xl font-semibold">
                  Performance Charts
                </CardTitle>
                <CardDescription>
                  Visual breakdown of team performance metrics
                </CardDescription>
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
              {/* On mobile: show either win-loss or power score chart based on toggle */}
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
                          <ChevronsRight className="h-3.5 w-3.5 text-gray-600" />
                        </>
                      ) : (
                        <>
                          <ChartBar className="h-4 w-4 text-gray-400" />
                          <ChartPie className="h-4 w-4 text-purple-600" />
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
                </div>
              ) : (
                // On desktop: show both charts side by side
                <>
                  <WinLossChartCard 
                    data={winLossData} 
                    chartLimit={chartLimit} 
                    isMobile={isMobile} 
                  />
                  
                  <PowerScoreChartCard data={powerScoreData} />
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
