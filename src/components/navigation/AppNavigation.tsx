
import React from "react";
import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import SwipeIndicator from "./SwipeIndicator";
import { useIsMobile } from "@/hooks/use-mobile";

export const AppNavigation: React.FC = () => {
  const isMobile = useIsMobile();
  
  return (
    <>
      {isMobile && <BottomNav />}
      {!isMobile && <DesktopNav />}
      {isMobile && <SwipeIndicator />}
    </>
  );
};

export default AppNavigation;
