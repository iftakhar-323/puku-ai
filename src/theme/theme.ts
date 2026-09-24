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
  assistantBubble: string;
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
  assistantBubble: AppColors.secondaryBackground, // #151125
  pumpkin: AppColors.pumpkin,
  blue: AppColors.blue,
  blueLite: AppColors.blueLite,
  coolGrey: AppColors.coolGrey,
};

export const lightTheme: ThemeColors = {
  background: '#F8F7FF',
  secondaryBackground: '#FFFFFF',
  cardBackground: '#FFFFFF',
  chatBarBackground: '#FFFFFF',
  chatBarBorder: '#E6E3F5',
  primary: '#6C47EB',
  primaryLight: '#8B6BFF',
  accent: '#A5A5FF',
  textPrimary: '#151324',
  textSecondary: '#6B6882',
  textMuted: '#9B98AE',
  placeholderText: '#7B7894',
  border: '#E8E5F7',
  outline: '#D9D5F0',
  buttonBackground: '#EFEBFB',
  pillBackground: '#E4DCF5',
  tagText: '#4A2EC7',
  menuIcon: '#322F48',
  error: '#FF4D4F',
  success: '#52C41A',
  warning: '#FAAD14',
  codeBackground: '#1C1732',
  thinkingBackground: '#F0ECFC',
  userBubble: '#6C47EB',
  assistantBubble: '#F2EFFC',
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
