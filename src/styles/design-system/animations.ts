/**
 * Animation classes for consistent motion effects
 */
export const animations = {
  // Fade animations
  fadeIn: 'animate-fade-in',
  fadeInSlowly: 'animate-fade-in-slowly',
  fadeInFast: 'animate-fade-in-fast',

  // Direction-based animations
  fadeInSlideUp: 'animate-fade-in-slide-up',
  fadeInSlideDown: 'animate-fade-in-slide-down',
  entranceLeft: 'animate-entrance-left',
  entranceRight: 'animate-entrance-right',

  // Scale animations
  scaleIn: 'animate-scale-in',

  // Combined animations
  fadeInScale: 'animate-fade-in animate-scale-in',

  // Interactive hover animations
  hoverScale: 'hover:scale-105 transition-transform duration-200',
  hoverFadeIn: 'opacity-85 hover:opacity-100 transition-opacity duration-200',
  hoverShadow: 'hover:shadow-lg transition-shadow duration-200',

  // Interactive press animations
  pressScale: 'active:scale-95 transition-transform duration-100',

  // Attention animations
  pulse: 'animate-soft-pulse',
  bounce: 'animate-subtle-bounce',

  // Animation delays
  delay: {
    none: '',
    short: 'animation-delay-100',
    medium: 'animation-delay-300',
    long: 'animation-delay-500',
  },
};
