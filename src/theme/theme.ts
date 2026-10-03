import { AppColors } from './colors';

export interface ThemeColors {
  isDark: boolean;
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
  /** Inline `code` and links in agent output (remote session). */
  inlineCode: string;
  inlineCodeBackground: string;
  link: string;
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
  isDark: true,
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
  inlineCode: '#F28B82',
  inlineCodeBackground: 'rgba(255, 255, 255, 0.06)',
  link: '#5AA9FF',
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
  isDark: false,
  background: '#f1f0e9', // official Puku light "main"
  secondaryBackground: '#e9e9e0', // official Puku light "sidebar"
  cardBackground: '#fafaf5', // official Puku light "panel"
  chatBarBackground: '#fafaf5', // official Puku light "panel"
  chatBarBorder: '#c9cdc0', // official Puku light "border"
  primary: '#111310',
  primaryLight: '#484dd0', // official Puku light "accent"
  accent: '#111310',
  textPrimary: '#282c22', // official Puku light "text"
  textSecondary: '#626759', // official Puku light "muted"
  textMuted: '#626759', // official Puku light "muted"
  placeholderText: '#626759', // official Puku light "muted"
  border: '#c9cdc0', // official Puku light "border"
  outline: '#c9cdc0', // official Puku light "border"
  buttonBackground: '#ffffff',
  pillBackground: '#e4e5db', // official Puku light "hover"
  tagText: '#111310',
  menuIcon: '#111310',
  error: '#b5263e',
  success: '#326b40', // official Puku light "success"
  warning: '#8b4a18',
  codeBackground: '#edece4',
  inlineCode: '#C0392B',
  inlineCodeBackground: '#F1EFE8',
  link: '#2563EB',
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
