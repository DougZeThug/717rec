
import React from "react";
import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import { useIsMobile } from "@/hooks/use-mobile";
import MessageBoardFAB from "@/components/message-board/MessageBoardFAB";

export const AppNavigation: React.FC = () => {
  const isMobile = useIsMobile();
  
  return (
    <>
      {isMobile && (
        <>
          <MessageBoardFAB />
          <BottomNav />
        </>
      )}
      {!isMobile && <DesktopNav />}
    </>
  );
};

export default AppNavigation;
