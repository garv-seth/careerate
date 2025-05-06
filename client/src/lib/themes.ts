/**
 * Careerate Theme System
 * 
 * This file defines the color system and theming for the Careerate application.
 * It provides consistent colors for all components and elements across the app.
 */

// Agent colors for consistent branding
export const agentColors = {
  cara: {
    primary: 'bg-blue-500',
    hover: 'hover:bg-blue-600',
    text: 'text-blue-600',
    border: 'border-blue-500',
    bg: 'bg-blue-600',
    bgLight: 'bg-blue-50',
    gradient: 'from-blue-400 to-blue-600',
  },
  maya: {
    primary: 'bg-purple-600',
    hover: 'hover:bg-purple-700',
    text: 'text-purple-600',
    border: 'border-purple-600',
    bg: 'bg-purple-600',
    bgLight: 'bg-purple-50',
    gradient: 'from-purple-500 to-purple-700',
  },
  ellie: {
    primary: 'bg-pink-500',
    hover: 'hover:bg-pink-600',
    text: 'text-pink-600',
    border: 'border-pink-500',
    bg: 'bg-pink-500',
    bgLight: 'bg-pink-50',
    gradient: 'from-pink-400 to-pink-600',
  },
  sophia: {
    primary: 'bg-green-600',
    hover: 'hover:bg-green-700',
    text: 'text-green-600',
    border: 'border-green-600',
    bg: 'bg-green-600',
    bgLight: 'bg-green-50',
    gradient: 'from-green-500 to-green-700',
  },
};

// UI element colors
export const uiColors = {
  // Primary actions and highlights
  primary: {
    bg: 'bg-primary',
    text: 'text-primary',
    border: 'border-primary',
    hover: 'hover:bg-primary/90',
  },
  // Secondary actions
  secondary: {
    bg: 'bg-secondary',
    text: 'text-secondary',
    border: 'border-secondary',
    hover: 'hover:bg-secondary/80',
  },
  // Accent UI elements
  accent: {
    bg: 'bg-accent',
    text: 'text-accent',
    border: 'border-accent',
    hover: 'hover:bg-accent/90',
  },
  // Destructive actions
  destructive: {
    bg: 'bg-destructive',
    text: 'text-destructive',
    border: 'border-destructive',
    hover: 'hover:bg-destructive/90',
  },
  // Muted elements
  muted: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-muted',
    hover: 'hover:bg-muted/80',
  },
};

// UI spacing system for consistent padding, margins, etc.
export const spacing = {
  xs: 'p-1', // 4px 
  sm: 'p-2', // 8px
  md: 'p-4', // 16px
  lg: 'p-6', // 24px
  xl: 'p-8', // 32px
  '2xl': 'p-10', // 40px
};

// Rounded corners for consistent UI elements
export const rounded = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

// Responsive breakpoints for consistent layouts
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Typography styles for consistent text elements
export const typography = {
  heading: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-2xl font-bold',
    h3: 'text-xl font-semibold',
    h4: 'text-lg font-semibold',
    h5: 'text-base font-semibold',
    h6: 'text-sm font-semibold',
  },
  body: {
    large: 'text-lg',
    default: 'text-base',
    small: 'text-sm',
    xs: 'text-xs',
  },
};

// Shadow system for consistent elevation
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  inner: 'shadow-inner',
};