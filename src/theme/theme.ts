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
  userBubble: AppColors.secondaryBackground, // #1c1d1a (matches official --user-msg-bg)
  onUserBubble: AppColors.primaryText, // #eeeee5
  assistantBubble: AppColors.background, // #151614
  iconBackground: AppColors.iconBackground, // #242620
  pumpkin: AppColors.pumpkin,
  blue: AppColors.blue,
  blueLite: AppColors.blueLite,
  coolGrey: AppColors.coolGrey,
};

export const lightTheme: ThemeColors = {
  background: '#f1f0e9', // Official Puku Light Main
  secondaryBackground: '#fafaf5', // Official Puku Light Panel
  cardBackground: '#fafaf5',
  chatBarBackground: '#e9e9e0',
  chatBarBorder: '#c9cdc0',
  primary: '#484dd0',
  primaryLight: '#484dd0',
  accent: '#484dd0',
  textPrimary: '#282c22',
  textSecondary: '#626759',
  textMuted: '#9da193',
  placeholderText: '#626759',
  border: '#c9cdc0',
  outline: '#c9cdc0',
  buttonBackground: '#fafaf5',
  pillBackground: '#e4e5db',
  tagText: '#484dd0',
  menuIcon: '#282c22',
  error: '#b5263e',
  success: '#326b40',
  warning: '#8b4a18',
  codeBackground: '#e9e9e0',
  thinkingBackground: '#e4e5db',
  userBubble: '#fafaf5',
  onUserBubble: '#282c22',
  assistantBubble: '#f1f0e9',
  iconBackground: '#e4e5db',
  pumpkin: '#8b4a18',
  blue: '#2B7FFF',
  blueLite: '#51A2FF',
  coolGrey: '#626759',
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
