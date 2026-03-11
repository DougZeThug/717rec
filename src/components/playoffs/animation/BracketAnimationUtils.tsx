// Animation keyframes for bracket updates
export const matchUpdateKeyframes = `
  @keyframes matchUpdate {
    0% { transform: scale(1); box-shadow: 0 0 0 rgba(139, 92, 246, 0); }
    50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
    100% { transform: scale(1); box-shadow: 0 0 0 rgba(139, 92, 246, 0); }
  }
`;

export const matchUpdateAnimation = `matchUpdate 0.8s ease-in-out`;

// Animation keyframes for round transitions
export const roundAppearKeyframes = `
  @keyframes roundAppear {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

export const roundAppearAnimation = `roundAppear 0.5s ease-out`;

// Animation keyframes for champion celebration
export const championKeyframes = `
  @keyframes champion {
    0% { transform: scale(0.8); opacity: 0; }
    40% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

export const championAnimation = `champion 1.2s ease-out`;

// Function to generate staggered animation delay
export const getStaggeredDelay = (index: number, baseDelay: number = 0.1) => {
  return `${baseDelay * index}s`;
};
