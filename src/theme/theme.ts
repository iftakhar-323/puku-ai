import { AppColors } from './colors';

export interface ThemeColors {
  background: string;
  secondaryBackground: string;
  cardBackground: string;
  chatBarBackground: string;
  chatBarBorder: string;
  primary: string;
  primaryLight: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  placeholderText: string;
  border: string;
  outline: string;
  buttonBackground: string;
  pillBackground: string;
  tagText: string;
  menuIcon: string;
  error: string;
  success: string;
  warning: string;
  codeBackground: string;
  thinkingBackground: string;
  userBubble: string;
  onUserBubble: string;
  assistantBubble: string;
  iconBackground: string;
  pumpkin: string;
  blue: string;
  blueLite: string;
  coolGrey: string;
}

export const darkTheme: ThemeColors = {
  background: AppColors.background, // #151614 (official Puku deep charcoal black)
  secondaryBackground: AppColors.secondaryBackground, // #1c1d1a (official Puku panel)
  cardBackground: AppColors.secondaryBackground, // #1c1d1a
  chatBarBackground: AppColors.secondaryBackground, // #1c1d1a
  chatBarBorder: AppColors.outline, // #34362e
  primary: AppColors.primary, // #242620
  primaryLight: AppColors.accent, // #b0b3fc
  accent: AppColors.accent, // #b0b3fc
  textPrimary: AppColors.primaryText, // #eeeee5
  textSecondary: AppColors.secondaryText, // #9da193
  textMuted: '#626759',
  placeholderText: AppColors.secondaryText, // #9da193
  border: AppColors.outline, // #34362e
  outline: AppColors.outline, // #34362e
  buttonBackground: 'rgba(255, 255, 255, 0.06)',
  pillBackground: 'rgba(255, 255, 255, 0.08)',
  tagText: AppColors.accent,
  menuIcon: AppColors.primaryText,
  error: AppColors.pukuDanger, // #ff9198
  success: AppColors.pukuSuccess, // #94c7a0
  warning: AppColors.pukuWarning, // #e8b187
  codeBackground: AppColors.secondary, // #10110f
  thinkingBackground: 'rgba(255, 255, 255, 0.04)',
  userBubble: 'rgba(255, 255, 255, 0.08)',
  onUserBubble: AppColors.primaryText, // #eeeee5
  assistantBubble: 'transparent',
  iconBackground: AppColors.iconBackground, // #242620
  pumpkin: AppColors.pumpkin,
  blue: AppColors.blue,
  blueLite: AppColors.blueLite,
  coolGrey: AppColors.coolGrey,
};

export const lightTheme: ThemeColors = {
  background: '#faf9f5',
  secondaryBackground: '#f3f1e8',
  cardBackground: '#ffffff',
  chatBarBackground: '#ffffff',
  chatBarBorder: '#d0d4c6',
  primary: '#111310',
  primaryLight: '#484dd0',
  accent: '#111310',
  textPrimary: '#111310', // Deep black for high contrast & clear legibility
  textSecondary: '#2b2f27', // Dark charcoal black-like text
  textMuted: '#4a4f43', // Dark readable muted text
  placeholderText: '#686e60', // Dark readable placeholder
  border: '#d0d4c6',
  outline: '#d0d4c6',
  buttonBackground: '#ffffff',
  pillBackground: '#e5e7dc',
  tagText: '#111310',
  menuIcon: '#111310',
  error: '#b5263e',
  success: '#206b35',
  warning: '#8b4a18',
  codeBackground: '#edece4',
  thinkingBackground: '#e7e9df',
  userBubble: '#e8e7df',
  onUserBubble: '#111310',
  assistantBubble: 'transparent',
  iconBackground: '#e0e2d7',
  pumpkin: '#8b4a18',
  blue: '#2B7FFF',
  blueLite: '#2B7FFF',
  coolGrey: '#2b2f27',
};

export const dimens = {
  space: {
    hairline: 1,
    superSmall: 4,
    small: 6,
    mediumSmall: 8,
    medium: 12,
    normal: 16,
    large: 20,
    superLarge: 24,
    huge: 30,
    giant: 36,
    jumbo: 48,
  },
  radius: {
    small: 8,
    medium: 16,
    large: 24,
    pill: 999,
  },
  font: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 28,
    hero: 34,
  },
};
