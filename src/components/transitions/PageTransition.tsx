
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  
  // Debug log to verify component rendering on route change
  useEffect(() => {
    console.log(`PageTransition: Rendering content for route: ${location.pathname}`);
  }, [location.pathname]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Debug indicator for current page */}
      <div className="fixed top-0 left-0 bg-green-500 text-white text-sm px-2 py-1 z-50">
        Route: {location.pathname}
      </div>
      {children}
    </div>
  );
};

export default PageTransition;
