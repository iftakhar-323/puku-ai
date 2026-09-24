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
}

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
  assistantBubble: '#FFFFFF',
};

export const darkTheme: ThemeColors = {
  background: '#100D1D',
  secondaryBackground: '#151125',
  cardBackground: '#1C1732',
  chatBarBackground: '#18142B',
  chatBarBorder: '#2A234A',
  primary: '#6C47EB',
  primaryLight: '#8B6BFF',
  accent: '#A5A5FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A29FBA',
  textMuted: '#6B6B8E',
  placeholderText: '#87868E',
  border: '#241D3E',
  outline: '#3A325E',
  buttonBackground: '#251F42',
  pillBackground: '#2B2350',
  tagText: '#C4B5FD',
  menuIcon: '#FFFFFF',
  error: '#FF6B6B',
  success: '#49AA19',
  warning: '#E07830',
  codeBackground: '#0B0817',
  thinkingBackground: '#1E1738',
  userBubble: '#4F33C4',
  assistantBubble: '#1A1530',
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
    medium: 14,
    large: 20,
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
