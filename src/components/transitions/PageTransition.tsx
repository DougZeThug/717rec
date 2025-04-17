
import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  // No transition or animation logic, just render children directly
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Debug indicator for current page */}
      <div className="fixed top-0 left-0 bg-green-500 text-white text-sm px-2 py-1 z-50">
        Direct Rendering - No Animations
      </div>
      {children}
    </div>
  );
};

export default PageTransition;
