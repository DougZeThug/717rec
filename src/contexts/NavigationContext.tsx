
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate, NavigateOptions } from 'react-router-dom';
import { RippleTransition } from '@/components/transitions/RippleTransition';

interface NavigationContextType {
  navigateWithTransition: (
    to: string, 
    options?: { 
      x?: number; 
      y?: number; 
      color?: string; 
      duration?: number;
      state?: any;
    }
  ) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [rippleState, setRippleState] = useState({
    isActive: false,
    originX: 0,
    originY: 0,
    color: "#1E3A5F", // cornhole navy by default
    duration: 400,
    targetRoute: '',
    navigateOptions: {} as NavigateOptions
  });

  const navigateWithTransition = useCallback((
    to: string, 
    options?: { 
      x?: number; 
      y?: number; 
      color?: string; 
      duration?: number;
      state?: any;
    }
  ) => {
    // For keyboard navigation or when coordinates aren't provided,
    // use the center of the screen
    const x = options?.x ?? window.innerWidth / 2;
    const y = options?.y ?? window.innerHeight / 2;
    const color = options?.color ?? "#1E3A5F";
    const duration = options?.duration ?? 400;
    
    const navigateOptions: NavigateOptions = { 
      state: options?.state 
    };

    setRippleState({
      isActive: true,
      originX: x,
      originY: y,
      color,
      duration,
      targetRoute: to,
      navigateOptions
    });
    
    // Log navigation attempt for debugging
    console.log(`Navigation initiated to: ${to}`);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    const { targetRoute, navigateOptions } = rippleState;
    console.log(`Animation complete, navigating to: ${targetRoute}`);
    
    // Actually perform the navigation
    navigate(targetRoute, navigateOptions);
    
    // Reset after a small delay to ensure the transition completes
    setTimeout(() => {
      setRippleState(prev => ({
        ...prev,
        isActive: false
      }));
    }, 50);
  }, [navigate, rippleState.targetRoute, rippleState.navigateOptions]);

  return (
    <NavigationContext.Provider value={{ navigateWithTransition }}>
      {children}
      <RippleTransition
        isActive={rippleState.isActive}
        originX={rippleState.originX}
        originY={rippleState.originY}
        color={rippleState.color}
        duration={rippleState.duration}
        onAnimationComplete={handleAnimationComplete}
      />
    </NavigationContext.Provider>
  );
};
