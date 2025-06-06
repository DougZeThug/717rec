
import React from "react";
import PageLayout from "@/components/layout/PageLayout";
import PageHeader from "@/components/layout/PageHeader";
import HistoryPageContent from "@/components/history/HistoryPageContent";
import { useIsMobile } from "@/hooks/use-mobile";
import PageTransition from "@/components/transitions/PageTransition";

const History: React.FC = () => {
  const isMobile = useIsMobile();
  
  return (
    <PageLayout 
      className="flex flex-col gap-4 md:gap-8" 
      compact={isMobile}
      gradientVariant="blueOrange"
    >
      <PageTransition animation="fadeInSlideDown">
        <PageHeader
          title="Season History"
          subtitle="Explore past seasons, champions, and standings"
          icon="📚"
        />
      </PageTransition>
      
      <div className="container mx-auto px-4">
        <PageTransition animation="fadeInSlideUp" delay="short">
          <HistoryPageContent />
        </PageTransition>
      </div>
    </PageLayout>
  );
};

export default History;
