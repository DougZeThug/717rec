
import React from "react";
import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import SwipeIndicator from "./SwipeIndicator";

export const GlobalNav = () => {
  return (
    <>
      <BottomNav />
      <DesktopNav />
      <SwipeIndicator />
    </>
  );
};

export default GlobalNav;
