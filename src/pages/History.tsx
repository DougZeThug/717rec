
import React from "react";
import PageLayout from "@/components/layout/PageLayout";
import PageHeader from "@/components/layout/PageHeader";
import HistoryPageContent from "@/components/history/HistoryPageContent";
import { useIsMobile } from "@/hooks/use-mobile";
import PageTransition from "@/components/transitions/PageTransition";
import AnimatedBreadcrumbs from "@/components/navigation/AnimatedBreadcrumbs";

const History: React.FC = () => {
  const isMobile = useIsMobile();
  
  return (
    <PageLayout 
      className="flex flex-col gap-4 md:gap-8" 
      compact={isMobile}
      gradientVariant="blueOrange"
    >
      <PageTransition animation="fadeInSlideDown">
        <div className="container mx-auto px-4">
          <AnimatedBreadcrumbs className="mb-2" />
        </div>
        <PageHeader
          title="Season History"
          description="Explore past seasons, champions, and standings"
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
