/**
 * Animation utility classes and presets
 * Provides reusable animation class names for consistent animations throughout the app
 */

export const animations = {
  // Entrance animations
  fadeIn: 'animate-fade-in',
  slideInUp: 'animate-slide-in-up',
  slideInDown: 'animate-slide-in-down',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',
  scaleIn: 'animate-scale-in',
  bounceIn: 'animate-bounce-in',

  // Exit animations
  fadeOut: 'animate-fade-out',
  slideOutUp: 'animate-slide-out-up',
  slideOutDown: 'animate-slide-out-down',

  // Hover effects
  hoverScale: 'transition-transform duration-300 hover:scale-105',
  hoverLift: 'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
  hoverGlow: 'transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,218,220,0.3)]',

  // Loading animations
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  skeleton: 'animate-skeleton',

  // Stagger delays (for list items)
  stagger1: 'animation-delay-100',
  stagger2: 'animation-delay-200',
  stagger3: 'animation-delay-300',
  stagger4: 'animation-delay-400',
  stagger5: 'animation-delay-500',
};

export const transitions = {
  smooth: 'transition-all duration-300 ease-in-out',
  fast: 'transition-all duration-150 ease-in-out',
  slow: 'transition-all duration-500 ease-in-out',
  bounce: 'transition-all duration-300 ease-out',
};

export const hoverEffects = {
  card: 'transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-white/20',
  button: 'transition-all duration-200 hover:scale-105 active:scale-95',
  link: 'transition-colors duration-200 hover:text-white',
  icon: 'transition-transform duration-200 hover:scale-110',
};

