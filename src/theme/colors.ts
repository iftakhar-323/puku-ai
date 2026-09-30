/**
 * Puku AI Color Tokens
 * Aligned with official @puku design system (https://ds.puku.sh) & chat.puku.sh
 */

export const AppColors = {
  black: '#000000',
  white: '#FFFFFF',

  // Official @puku design tokens (matching /puku-web-chat CSS tokens)
  pukuAccent: '#d699ff',
  pukuAccentInk: '#201c59',
  pukuMain: '#100d1d',
  pukuSidebar: '#100d1d',
  pukuPanel: '#151125',
  pukuBorder: 'rgba(255, 255, 255, 0.08)',
  pukuText: '#ffffff',
  pukuMuted: 'rgba(255, 255, 255, 0.65)',
  pukuDanger: '#c73738',
  pukuSuccess: '#17aa58',
  pukuWarning: '#e8b187',
  pukuBrand: '#484fa3',
  pukuBrandPurple: '#9941d7',

  // Core App Tokens mapped to official Puku web theme
  primaryText: '#ffffff',
  secondaryText: 'rgba(255, 255, 255, 0.65)',

  primary: '#201c59',
  secondary: '#100d1d',
  background: '#100d1d', // matches --puku-chat-bg-web: #100d1d
  secondaryBackground: '#151125', // matches --puku-chat-composer-bg: #151125
  sidebarBackground: '#100d1d',
  iconBackground: '#201c59',
  outline: 'rgba(255, 255, 255, 0.08)',
  outlineVariant: 'rgba(255, 255, 255, 0.14)',
  coolGrey: 'rgba(255, 255, 255, 0.65)',
  pumpkin: '#e8b187',
  accent: '#d699ff',
  blue: '#484fa3',
  blueLite: '#d699ff',
  paleSky: '#B8C4D0',
  link: '#d699ff',
} as const;

export const colors = AppColors;
export type Colors = typeof AppColors;

