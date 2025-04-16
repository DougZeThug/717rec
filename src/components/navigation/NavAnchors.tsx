
import React from "react";
import { Link } from "react-router-dom";
import { Award, Calendar, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface NavAnchorItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const NavAnchorItem = ({ to, label, icon }: NavAnchorItemProps) => {
  return (
    <Link
      to={to}
      className="flex flex-col items-center w-full p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow text-cornhole-navy hover:bg-cornhole-cream"
    >
      {icon}
      <span className="mt-2 font-medium">{label}</span>
    </Link>
  );
};

export const NavAnchors = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className={cn(
      "w-full bg-cornhole-cream/30 py-4 px-4",
      isMobile ? "sticky top-0 z-10" : ""
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
