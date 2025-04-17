
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const SwipeIndicator = () => {
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const isMobile = useIsMobile();
  const location = useLocation();
  
  useEffect(() => {
    if (!isMobile) return;
    
    let touchStartX = 0;
    let touchMoveX = 0;
    const minSwipeIndicatorDistance = 30; // Minimum distance to show indicator
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      setSwipeDirection(null);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      touchMoveX = e.touches[0].clientX;
      const diff = touchMoveX - touchStartX;
      
      // Show feedback based on the swipe direction
      if (Math.abs(diff) >= minSwipeIndicatorDistance) {
        if (diff > 0) {
          setSwipeDirection('right');
          setShowLeft(true);
          setShowRight(false);
        } else {
          setSwipeDirection('left');
          setShowLeft(false);
          setShowRight(true);
        }
      } else {
        setSwipeDirection(null);
        setShowLeft(false);
        setShowRight(false);
      }
    };
    
    const handleTouchEnd = () => {
      setShowLeft(false);
      setShowRight(false);
      setSwipeDirection(null);
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
  }, [isMobile]);
  
  // Reset indicators when route changes
  useEffect(() => {
    setShowLeft(false);
    setShowRight(false);
    setSwipeDirection(null);
  }, [location.pathname]);
  
  if (!isMobile) return null;
  
  return (
    <>
      <div 
        className={cn(
          "fixed top-1/2 left-4 transform -translate-y-1/2 w-12 h-12 rounded-full bg-cornhole-navy/20 flex items-center justify-center transition-all duration-200 z-50",
          showLeft ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </div>
      <div 
        className={cn(
          "fixed top-1/2 right-4 transform -translate-y-1/2 w-12 h-12 rounded-full bg-cornhole-navy/20 flex items-center justify-center transition-all duration-200 z-50",
          showRight ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </div>
    </>
  );
};

export default SwipeIndicator;
