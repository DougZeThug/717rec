
import React from "react";
import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import SwipeIndicator from "./SwipeIndicator";
import { useIsMobile } from "@/hooks/use-mobile";

export const GlobalNav = () => {
  const isMobile = useIsMobile();
  
  return (
    <>
      <BottomNav />
      <DesktopNav />
      {isMobile && <SwipeIndicator />}
    </>
  );
};

export default GlobalNav;
