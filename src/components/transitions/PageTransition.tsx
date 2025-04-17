
import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {children}
    </div>
  );
};

export default PageTransition;
