
import React from "react";
import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import { useIsMobile } from "@/hooks/use-mobile";

export const GlobalNav = () => {
  const isMobile = useIsMobile();
  
  return (
    <>
      <BottomNav />
      <DesktopNav />
    </>
  );
};

export default GlobalNav;
