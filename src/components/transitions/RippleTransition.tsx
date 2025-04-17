
import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface RippleTransitionProps {
  isActive: boolean;
  originX: number;
  originY: number;
  color?: string;
  duration?: number;
  onAnimationComplete: () => void;
}

export const RippleTransition: React.FC<RippleTransitionProps> = ({
  isActive,
  originX,
  originY,
  color = "#1E3A5F", // cornhole navy by default
  duration = 400,
  onAnimationComplete,
}) => {
  const rippleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && rippleRef.current) {
      const handleTransitionEnd = () => {
        onAnimationComplete();
      };
      
      rippleRef.current.addEventListener('transitionend', handleTransitionEnd);
      
      return () => {
        rippleRef.current?.removeEventListener('transitionend', handleTransitionEnd);
      };
    }
  }, [isActive, onAnimationComplete]);

  if (!isActive) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <div
        ref={rippleRef}
        className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-400 ease-out"
        style={{
          top: originY,
          left: originX,
          backgroundColor: color,
          width: '10px',
          height: '10px',
          transitionDuration: `${duration}ms`,
          transform: 'scale(0)',
          opacity: 0,
          // Immediately after mount, expand to cover screen
          animation: `rippleExpand ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`
        }}
      />
      <style jsx global>{`
        @keyframes rippleExpand {
          to {
            transform: scale(300);
            opacity: 1;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};
