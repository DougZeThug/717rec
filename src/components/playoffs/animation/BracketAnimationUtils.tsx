
import { keyframes } from "@emotion/react";
import { animations } from "@/styles/design-system";

// Animation keyframes for bracket updates
export const matchUpdateKeyframes = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 rgba(139, 92, 246, 0); }
  50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
  100% { transform: scale(1); box-shadow: 0 0 0 rgba(139, 92, 246, 0); }
`;

export const matchUpdateAnimation = `${matchUpdateKeyframes} 0.8s ease-in-out`;

// Animation keyframes for round transitions
export const roundAppearKeyframes = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`;

export const roundAppearAnimation = `${roundAppearKeyframes} 0.5s ease-out`;

// Animation keyframes for champion celebration
export const championKeyframes = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  40% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

export const championAnimation = `${championKeyframes} 1.2s ease-out`;

// Function to generate staggered animation delay
export const getStaggeredDelay = (index: number, baseDelay: number = 0.1) => {
  return `${baseDelay * index}s`;
};

