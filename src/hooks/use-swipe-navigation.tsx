
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "./use-mobile";

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // The main routes we want to enable swipe between
  const mainRoutes = ["/stats", "/schedule", "/teams"];
  
  useEffect(() => {
    // Don't activate swipe on desktop
    if (!isMobile) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 75; // Minimum distance required for a swipe
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      // We're not preventing default here to allow scrolling
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      handleSwipe();
    };
    
    const handleSwipe = () => {
      const swipeDistance = touchEndX - touchStartX;
      const absDist = Math.abs(swipeDistance);
      
      // Only register as swipe if the distance is significant
      if (absDist < minSwipeDistance) return;
      
      // Find current route index
      const currentPathBase = `/${location.pathname.split('/')[1]}`;
      const currentIndex = mainRoutes.findIndex(route => 
        currentPathBase === route || location.pathname.startsWith(route)
      );
      
      // If we're not on a main route, don't navigate
      if (currentIndex === -1) return;
      
      // Swipe right = go to previous route
      if (swipeDistance > 0) {
        const prevIndex = (currentIndex - 1 + mainRoutes.length) % mainRoutes.length;
        navigate(mainRoutes[prevIndex]);
      } 
      // Swipe left = go to next route
      else {
        const nextIndex = (currentIndex + 1) % mainRoutes.length;
        navigate(mainRoutes[nextIndex]);
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
}

