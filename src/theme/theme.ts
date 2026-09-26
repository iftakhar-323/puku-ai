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
  background: AppColors.background, // #100D1D
  secondaryBackground: AppColors.secondaryBackground, // #151125
  cardBackground: AppColors.secondaryBackground, // #151125
  chatBarBackground: AppColors.secondaryBackground, // #151125
  chatBarBorder: AppColors.outline, // rgba(255,255,255,0.2)
  primary: AppColors.primary, // #201C59
  primaryLight: AppColors.blue, // #2B7FFF
  accent: AppColors.accent, // #A5A5FF
  textPrimary: AppColors.primaryText, // #FFFFFF
  textSecondary: AppColors.secondaryText, // #87868E
  textMuted: AppColors.coolGrey, // #6B6B8E
  placeholderText: AppColors.secondaryText, // #87868E
  border: AppColors.outline,
  outline: AppColors.outline,
  buttonBackground: 'rgba(255, 255, 255, 0.06)',
  pillBackground: 'rgba(255, 255, 255, 0.08)',
  tagText: AppColors.accent,
  menuIcon: AppColors.white,
  error: '#FF4D4F',
  success: '#52C41A',
  warning: AppColors.pumpkin, // #E07830
  codeBackground: AppColors.secondary, // #0B0817
  thinkingBackground: 'rgba(255, 255, 255, 0.04)',
  userBubble: AppColors.primary, // #201C59
  onUserBubble: '#FFFFFF',
  assistantBubble: AppColors.black, // #000000 matching Flutter surfaceContainerHighest
  iconBackground: AppColors.iconBackground, // #1C1732
  pumpkin: AppColors.pumpkin,
  blue: AppColors.blue,
  blueLite: AppColors.blueLite,
  coolGrey: AppColors.coolGrey,
};

export const lightTheme: ThemeColors = {
  background: '#FBFBFE',
  secondaryBackground: '#FFFFFF',
  cardBackground: '#FFFFFF',
  chatBarBackground: '#F0EEF8',
  chatBarBorder: '#E4E0F2',
  primary: '#6C47EB',
  primaryLight: '#8B6BFF',
  accent: '#7B61FF',
  textPrimary: '#1A1729',
  textSecondary: '#6F6B85',
  textMuted: '#9B98AE',
  placeholderText: '#8E8A9F',
  border: '#EAE7F5',
  outline: '#E0DCF0',
  buttonBackground: '#FFFFFF',
  pillBackground: '#E8E3FA',
  tagText: '#4A2EC7',
  menuIcon: '#1A1729',
  error: '#FF4D4F',
  success: '#52C41A',
  warning: '#FAAD14',
  codeBackground: '#F2F0FA',
  thinkingBackground: '#F0ECFC',
  userBubble: '#EAE4F9',
  onUserBubble: '#1E1B2E',
  assistantBubble: '#FBFBFE',
  iconBackground: '#E8E3FA',
  pumpkin: '#E07830',
  blue: '#2B7FFF',
  blueLite: '#51A2FF',
  coolGrey: '#6B6B8E',
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
