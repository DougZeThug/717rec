
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import CompactStandings from "@/components/stats/CompactStandings";
import StatsSummaryCards from "@/components/stats/StatsSummaryCards";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";

interface StatsSummarySectionProps {
  rankings: Ranking[];
  scrollToFullRankings: () => void;
}

const StatsSummarySection = ({ 
  rankings, 
  scrollToFullRankings 
}: StatsSummarySectionProps) => {
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const compactLimit = isMobile ? 5 : 5;
  const cardBg = "bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#1E1E1E] dark:text-white dark:border-none rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]";

  return (
    <>
      <Card className={`mb-3 ${cardBg} p-0`}>
        <CardHeader className={`pb-1.5 rounded-t-xl ${isMobile ? 'py-3' : 'py-6'}`}
          style={isLight ? { borderBottom: '1px solid #e0e0e0', borderTopLeftRadius: 12, borderTopRightRadius: 12, background: '#fff' } : {}}>
          <CardTitle className={`font-semibold ${isMobile ? 'text-base' : 'text-lg sm:text-xl'} font-inter tracking-wide text-[#1a1a1a] dark:text-white uppercase`} style={{ letterSpacing: ".03em" }}>
            Current Standings
          </CardTitle>
          <CardDescription className="text-[#333] dark:text-gray-400 font-light font-inter mt-1 mb-0">
            Top {compactLimit} teams based on performance
          </CardDescription>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-2 pt-1' : 'p-4 pt-1 sm:pt-4'}`}>
          <CompactStandings rankings={rankings.slice(0, compactLimit)} />
          <div className={`${isMobile ? 'mt-2' : 'mt-3'} text-center`}>
            <Button
              onClick={scrollToFullRankings}
              variant="outline"
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 font-inter font-semibold bg-white text-[#1a1a1a] hover:bg-[#f0f0f0] border border-[#e0e0e0] dark:bg-transparent dark:text-white dark:border-gray-700 ${isMobile ? 'text-sm' : 'text-base'}`}
            >
              View Full Standings
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className={`${isMobile ? 'mb-3' : 'mb-5'}`}>
        <h2 className={`font-inter ${isMobile ? 'text-base' : 'text-lg sm:text-xl'} font-semibold tracking-wide text-[#1a1a1a] dark:text-white mb-1 uppercase`} style={{ letterSpacing: ".03em" }}>
          League Highlights
        </h2>
        <StatsSummaryCards rankings={rankings} />
      </div>
    </>
  );
};

export default StatsSummarySection;
