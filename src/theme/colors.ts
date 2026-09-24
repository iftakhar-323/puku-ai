/**
 * Puku AI Color Tokens
 * 1:1 match with /lib/theme/app_colors.dart from Flutter
 */

export const AppColors = {
  black: '#000000',
  white: '#FFFFFF',

  primaryText: '#FFFFFF',
  secondaryText: '#87868E',

  primary: '#201C59',
  secondary: '#0B0817',
  background: '#100D1D',
  secondaryBackground: '#151125',
  iconBackground: '#1C1732',
  outline: 'rgba(255, 255, 255, 0.2)',
  outlineVariant: 'rgba(255, 255, 255, 0.12)',
  coolGrey: '#6B6B8E',
  pumpkin: '#E07830',
  accent: '#A5A5FF',
  blue: '#2B7FFF',
  blueLite: '#51A2FF',
  paleSky: '#B8C4D0',
  link: '#5AC8FA',
} as const;

export const colors = AppColors;
export type Colors = typeof AppColors;
