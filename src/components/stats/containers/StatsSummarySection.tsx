
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import CompactStandings from "@/components/stats/CompactStandings";
import StatsSummaryCards from "@/components/stats/StatsSummaryCards";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { gradients } from "@/styles/design-system";

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
  
  // Improved card styling with subtle gradient
  const cardStyle = cn(
    "mb-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300",
    "border-t-2 border-blue-300 dark:border-blue-700/60",
    isLight ? gradients.card.blueOrange : "bg-gray-800/90 border-gray-700"
  );
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Card className={cardStyle}>
          <CardHeader className={cn(
            `pb-2 rounded-t-xl ${isMobile ? 'py-3 px-4' : 'py-6 px-6'}`,
            isLight ? 
              "bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30 border-b border-blue-100" : 
              "bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/90 border-b border-gray-700"
          )}>
            <CardTitle className={cn(
              "font-semibold text-lg sm:text-xl font-inter tracking-wide",
              isLight ? 
                "bg-gradient-to-br from-blue-800 via-blue-700 to-amber-700 bg-clip-text text-transparent" :
                "text-white"
            )}>
              Current Standings
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 font-inter mt-1 mb-0">
              Top {compactLimit} teams based on performance
            </CardDescription>
          </CardHeader>
          <CardContent className={cn(
            `${isMobile ? 'p-3' : 'p-4'}`,
            "bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800/90 dark:to-gray-900"
          )}>
            <CompactStandings rankings={rankings.slice(0, compactLimit)} />
            <div className="mt-4 text-center">
              <Button
                onClick={scrollToFullRankings}
                variant="blueOrange"
                className="flex items-center gap-2 rounded-lg px-4 py-2 font-inter font-medium shadow-sm"
              >
                View Full Standings
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <div className="mb-4">
          <h2 className={cn(
            "font-inter text-lg sm:text-xl font-semibold tracking-wide mb-3 px-1",
            "border-l-4 border-blue-500 dark:border-blue-700 pl-3",
            "bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent",
            isLight ? "text-gray-900" : "text-white"
          )}>
            League Highlights
          </h2>
          <StatsSummaryCards rankings={rankings} />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StatsSummarySection;
