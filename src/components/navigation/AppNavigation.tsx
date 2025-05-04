
import React from "react";
import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import { useIsMobile } from "@/hooks/use-mobile";

export const AppNavigation: React.FC = () => {
  const isMobile = useIsMobile();
  
  return (
    <>
      {isMobile && <BottomNav />}
      {!isMobile && <DesktopNav />}
    </>
  );
};

export default AppNavigation;
