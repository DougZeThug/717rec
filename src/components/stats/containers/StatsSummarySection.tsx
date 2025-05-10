
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
    "mb-4 rounded-xl shadow-sm",
    isLight ? "bg-white border border-[#e8e8e8]" : "bg-gray-800/90 border-gray-700"
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
          <CardHeader className={`pb-2 rounded-t-xl ${isMobile ? 'py-3 px-4' : 'py-6 px-6'}`}
            style={isLight ? { 
              borderBottom: '1px solid #e8e8e8', 
              borderTopLeftRadius: 12, 
              borderTopRightRadius: 12, 
              background: 'linear-gradient(to bottom, #ffffff, #fafafa)'
            } : {}}>
            <CardTitle className="font-semibold text-lg sm:text-xl font-inter tracking-wide text-gray-900 dark:text-white">
              Current Standings
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 font-inter mt-1 mb-0">
              Top {compactLimit} teams based on performance
            </CardDescription>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <CompactStandings rankings={rankings.slice(0, compactLimit)} />
            <div className="mt-4 text-center">
              <Button
                onClick={scrollToFullRankings}
                variant="outline"
                className="flex items-center gap-2 rounded-lg px-4 py-2 font-inter font-medium bg-white text-gray-800 hover:bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700"
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
          <h2 className="font-inter text-lg sm:text-xl font-semibold tracking-wide text-gray-900 dark:text-white mb-3">
            League Highlights
          </h2>
          <StatsSummaryCards rankings={rankings} />
        </div>
      </motion.div>
    </motion.div>
  );
};

// Helper function for class names
const cn = (...classes: (string | undefined | boolean)[]) => {
  return classes.filter(Boolean).join(' ');
};

export default StatsSummarySection;
