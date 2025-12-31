import React, { useState, useCallback, useEffect } from "react";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import WinLossChartCard from "./WinLossChartCard";
import PowerScoreChartCard from "./PowerScoreChartCard";
import PowerScoreTrendsCard from "./PowerScoreTrendsCard";
import { useChartData } from "./hooks/useChartData";
import { cn } from "@/lib/utils";
import { gradients } from "@/styles/design-system";
import { useTheme } from "next-themes";
import useEmblaCarousel from "embla-carousel-react";

interface StatsChartsProps {
  rankings: Ranking[];
  chartLimit: number;
}

const StatsCharts = ({ rankings, chartLimit }: StatsChartsProps) => {
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { winLossData, powerScoreData } = useChartData(rankings, chartLimit);
  const [isOpen, setIsOpen] = useState(false);
  
  // Carousel for mobile
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, dragFree: true, skipSnaps: true, duration: 20 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);
  
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  const chartLabels = ["Win-Loss", "Power Score", "Trends"];

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
                    "bg-gradient-to-br from-blue-800 via-blue-700 to-amber-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-400",
                    "heading-winter"
                  )}
                  style={{ letterSpacing: "0.5px" }}
                >
                  Performance Charts
                </CardTitle>
                {!isMobile && (
                  <CardDescription className={cn(
                    isLight ? "text-gray-600 font-medium font-inter" : "text-gray-400 font-inter"
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
              {/* On mobile: swipeable carousel */}
              {isMobile ? (
                <div className="col-span-1">
                  <div className="overflow-hidden will-change-transform" ref={emblaRef}>
                    <div className="flex touch-pan-y">
                      <div className="flex-[0_0_100%] min-w-0 pr-2">
                        <WinLossChartCard 
                          data={winLossData} 
                          chartLimit={chartLimit} 
                          isMobile={isMobile} 
                        />
                      </div>
                      <div className="flex-[0_0_100%] min-w-0 pr-2">
                        <PowerScoreChartCard data={powerScoreData} />
                      </div>
                      <div className="flex-[0_0_100%] min-w-0">
                        <PowerScoreTrendsCard />
                      </div>
                    </div>
                  </div>
                  {/* Dot indicators */}
                  <div className="flex justify-center gap-2 mt-3">
                    {chartLabels.map((label, index) => (
                      <button
                        key={index}
                        onClick={() => emblaApi?.scrollTo(index)}
                        className={cn(
                          "px-2 py-1 rounded-full text-xs transition-all",
                          selectedIndex === index
                            ? "bg-blue-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {label}
                      </button>
                    ))}
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
