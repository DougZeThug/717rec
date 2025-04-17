
import React from "react";
import { Award, Calendar, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { TransitionLink } from "@/components/transitions/TransitionLink";
import { getCardInteractionStyles } from "@/styles/interactionUtils";

interface NavAnchorItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const NavAnchorItem = ({ to, label, icon }: NavAnchorItemProps) => {
  return (
    <TransitionLink
      to={to}
      className={getCardInteractionStyles("flex flex-col items-center w-full p-4 bg-white rounded-lg shadow-md text-cornhole-navy hover:bg-cornhole-cream")}
      noFeedback
    >
      {icon}
      <span className="mt-2 font-medium">{label}</span>
    </TransitionLink>
  );
};

// This component is rendering the floating navigation buttons
// Let's modify this to only appear on non-homepage routes
export const NavAnchors = () => {
  const isMobile = useIsMobile();
  const location = window.location.pathname;
  
  // Don't render on homepage
  if (location === "/") {
    return null;
  }
  
  return (
    <div className={cn(
      "w-full bg-cornhole-cream/30 py-4 px-4",
      isMobile ? "sticky top-0 z-10 backdrop-blur-sm" : ""
    )}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-3 gap-4">
          <NavAnchorItem 
            to="/stats" 
            label="Standings" 
            icon={<Award size={24} className="text-cornhole-navy" />} 
          />
          <NavAnchorItem 
            to="/schedule" 
            label="Schedule" 
            icon={<Calendar size={24} className="text-cornhole-navy" />} 
          />
          <NavAnchorItem 
            to="/teams" 
            label="Teams" 
            icon={<Users size={24} className="text-cornhole-navy" />} 
          />
        </div>
      </div>
    </div>
  );
};

export default NavAnchors;
