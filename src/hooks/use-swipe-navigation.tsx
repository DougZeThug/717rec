
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "./use-mobile";

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [swipeInProgress, setSwipeInProgress] = useState(false);
  
  // The main routes we want to enable swipe between
  const mainRoutes = ["/stats", "/schedule", "/teams"];
  
  useEffect(() => {
    // Don't activate swipe on desktop
    if (!isMobile) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    const minSwipeDistance = 75; // Minimum distance required for a swipe
    const maxVerticalDistance = 50; // Maximum vertical movement to still count as horizontal swipe
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      setSwipeInProgress(true);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      // We're not preventing default here to allow scrolling
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;
      handleSwipe();
      setSwipeInProgress(false);
    };
    
    const handleSwipe = () => {
      const horizontalDistance = touchEndX - touchStartX;
      const verticalDistance = Math.abs(touchEndY - touchStartY);
      const absHorizontalDist = Math.abs(horizontalDistance);
      
      // Only register as swipe if:
      // 1. The horizontal distance is significant
      // 2. The vertical distance is not too large (to avoid capturing scrolls as swipes)
      if (absHorizontalDist < minSwipeDistance || verticalDistance > maxVerticalDistance) return;
      
      // Find current route index
      const currentPathBase = `/${location.pathname.split('/')[1]}`;
      const currentIndex = mainRoutes.findIndex(route => 
        currentPathBase === route || location.pathname.startsWith(route)
      );
      
      // If we're not on a main route, don't navigate
      if (currentIndex === -1) return;
      
      // Swipe right = go to previous route
      if (horizontalDistance > 0) {
        const prevIndex = (currentIndex - 1 + mainRoutes.length) % mainRoutes.length;
        navigate(mainRoutes[prevIndex], { 
          state: { 
            swipeDirection: 'right' 
          } 
        });
      } 
      // Swipe left = go to next route
      else {
        const nextIndex = (currentIndex + 1) % mainRoutes.length;
        navigate(mainRoutes[nextIndex], { 
          state: { 
            swipeDirection: 'left' 
          } 
        });
      }
    };
    
    // Add event listeners to the document
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    
    // Clean up event listeners
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate, location.pathname, isMobile]);
  
  return { swipeInProgress };
}
