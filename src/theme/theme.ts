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
  background: '#100d1d', // matches --puku-chat-bg-web: #100d1d
  secondaryBackground: '#151125', // matches --puku-chat-composer-bg: #151125
  cardBackground: '#151125',
  chatBarBackground: '#151125',
  chatBarBorder: 'rgba(255, 255, 255, 0.08)',
  primary: '#201c59', // matches --puku-chat-send-bg: #201c59
  primaryLight: '#d699ff', // matches --claude-accent: #d699ff
  accent: '#d699ff', // matches --claude-accent: #d699ff
  textPrimary: '#ffffff', // matches --claude-text: #ffffff
  textSecondary: 'rgba(255, 255, 255, 0.65)', // matches --claude-text-muted: rgba(255, 255, 255, 0.65)
  textMuted: 'rgba(255, 255, 255, 0.45)', // matches --claude-text-subtle: rgba(255, 255, 255, 0.45)
  placeholderText: 'rgba(255, 255, 255, 0.45)',
  border: 'rgba(255, 255, 255, 0.08)', // matches --claude-border
  outline: 'rgba(255, 255, 255, 0.08)',
  buttonBackground: 'rgba(255, 255, 255, 0.06)',
  pillBackground: 'rgba(255, 255, 255, 0.08)',
  tagText: '#d699ff',
  menuIcon: '#ffffff',
  error: '#c73738', // matches --claude-red: #c73738
  success: '#17aa58', // matches --claude-green: #17aa58
  warning: '#e8b187',
  codeBackground: '#161b22', // matches --claude-code-bg: #161b22
  thinkingBackground: 'rgba(255, 255, 255, 0.04)',
  userBubble: 'rgba(255, 255, 255, 0.08)', // matches --claude-user-bg: rgba(255, 255, 255, 0.08)
  onUserBubble: '#ffffff',
  assistantBubble: 'transparent',
  iconBackground: '#201c59',
  pumpkin: '#e8b187',
  blue: '#484fa3',
  blueLite: '#d699ff',
  coolGrey: 'rgba(255, 255, 255, 0.65)',
};

export const lightTheme: ThemeColors = {
  background: '#faf9f5', // matches --puku-chat-bg-web: #faf9f5
  secondaryBackground: '#f5f4ed', // matches --claude-sidebar: #f5f4ed
  cardBackground: '#ffffff', // matches --claude-surface: #ffffff
  chatBarBackground: '#ffffff',
  chatBarBorder: 'rgba(0, 0, 0, 0.08)',
  primary: '#484fa3', // matches --puku-chat-send-bg: #484fa3
  primaryLight: '#9941d7', // matches --claude-accent: #9941d7
  accent: '#9941d7',
  textPrimary: '#1a1915', // matches --claude-text: #1a1915
  textSecondary: '#73726c', // matches --claude-text-muted: #73726c
  textMuted: '#a8a69e', // matches --claude-text-subtle: #a8a69e
  placeholderText: '#a8a69e',
  border: 'rgba(0, 0, 0, 0.08)', // matches --claude-border: rgba(0, 0, 0, 0.08)
  outline: 'rgba(0, 0, 0, 0.08)',
  buttonBackground: '#ffffff',
  pillBackground: 'rgba(0, 0, 0, 0.04)',
  tagText: '#9941d7',
  menuIcon: '#1a1915',
  error: '#c73738',
  success: '#17aa58',
  warning: '#8b4a18',
  codeBackground: '#f6f8fa', // matches --claude-code-bg: #f6f8fa
  thinkingBackground: 'rgba(0, 0, 0, 0.04)',
  userBubble: '#eeede8', // matches --claude-user-bg: #eeede8
  onUserBubble: '#1a1915',
  assistantBubble: 'transparent',
  iconBackground: 'rgba(0, 0, 0, 0.06)',
  pumpkin: '#8b4a18',
  blue: '#484fa3',
  blueLite: '#9941d7',
  coolGrey: '#73726c',
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
