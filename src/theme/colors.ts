/**
 * Puku AI Color Palette
 * Extracted directly from the official Puku AI Flutter design interface
 */

export const colors = {
  // Brand & Accent Gradients
  primary: '#6C47EB',           // Brand Purple / Violet
  primaryLight: '#9B7BF7',      // Soft Lilac / Gradient highlight
  primaryDark: '#5534DA',       // Deep Purple
  gradientStart: '#5C3BE6',
  gradientEnd: '#B598FB',

  // Backgrounds
  backgroundTop: '#FFFFFF',     // Pure white top fade
  background: '#FAF8FE',        // Main screen subtle lavender background
  backgroundBottom: '#EFEBFA',  // Bottom subtle gradient tint

  // Card / Bottom Bar Surfaces
  chatBarBackground: '#EFEBFA', // Floating input card
  chatBarBorder: '#E3DCF4',     // Card subtle border
  pillBackground: '#E4DCF5',    // "puku-ai-2.7" model tag pill
  buttonBackground: '#E4DCF5',  // Plus (+) & Mic icon button circle

  // Typography
  textPrimary: '#111115',       // "How can i help you"
  textSecondary: '#7A768A',     // "today!"
  placeholderText: '#938FA4',   // "Chat with Puku"
  tagText: '#3D384C',           // Model tag & icon color

  // UI Accents
  menuIcon: '#111115',          // Top hamburger menu
  homeIndicator: '#201E29',     // Android / iOS home indicator
} as const;

export type Colors = typeof colors;
