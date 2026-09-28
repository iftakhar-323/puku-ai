/**
 * Puku AI Color Tokens
 * Aligned with official @puku design system (https://ds.puku.sh) & chat.puku.sh
 */

export const AppColors = {
  black: '#000000',
  white: '#FFFFFF',

  // Official @puku design tokens (ds.puku.sh)
  pukuAccent: '#b0b3fc',
  pukuAccentInk: '#242449',
  pukuMain: '#151614',
  pukuSidebar: '#10110f',
  pukuPanel: '#1c1d1a',
  pukuBorder: '#34362e',
  pukuText: '#eeeee5',
  pukuMuted: '#9da193',
  pukuDanger: '#ff9198',
  pukuSuccess: '#94c7a0',
  pukuWarning: '#e8b187',

  // Core App Tokens mapped to official Puku obsidian/charcoal black
  primaryText: '#eeeee5',
  secondaryText: '#9da193',

  primary: '#242620',
  secondary: '#10110f',
  background: '#151614', // Official Puku main charcoal black
  secondaryBackground: '#1c1d1a', // Official Puku panel
  sidebarBackground: '#10110f', // Official Puku sidebar
  iconBackground: '#242620',
  outline: '#34362e', // Official Puku border
  outlineVariant: 'rgba(52, 54, 46, 0.6)',
  coolGrey: '#9da193',
  pumpkin: '#e8b187',
  accent: '#b0b3fc',
  blue: '#2B7FFF',
  blueLite: '#51A2FF',
  paleSky: '#B8C4D0',
  link: '#b0b3fc',
} as const;

export const colors = AppColors;
export type Colors = typeof AppColors;

