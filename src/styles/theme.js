import { DefaultTheme } from 'react-native-paper';
import { config as gluestackConfig } from '@gluestack-ui/config';

// Money Green Color Palette
export const colors = {
  primary: '#16a34a',       // green-600
  primaryDark: '#15803d',   // green-700
  primaryDarker: '#166534', // green-800
  primaryLight: '#22c55e',  // green-500
  primaryLighter: '#bbf7d0',// green-200
  primaryLightest: '#f0fdf4',// green-50
  primaryMuted: '#dcfce7',  // green-100
  background: '#ffffff',
  backgroundSecondary: '#f0fdf4', // green-50 tinted bg
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
  white: '#ffffff',
  black: '#000000',
};

// React Native Paper theme (kept for backward compat with Paper components still in use)
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    accent: colors.primaryLight,
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
    textSecondary: colors.textSecondary,
    border: colors.border,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
  },
  roundness: 12,
  animation: {
    scale: 1.0,
    useNativeDriver: false,
  },
};

// Gluestack UI custom config with money green tokens
export const gluestackThemeConfig = {
  ...gluestackConfig,
  tokens: {
    ...gluestackConfig.tokens,
    colors: {
      ...gluestackConfig.tokens.colors,
      // Override primary with money green
      primary0: '#f0fdf4',
      primary50: '#f0fdf4',
      primary100: '#dcfce7',
      primary200: '#bbf7d0',
      primary300: '#86efac',
      primary400: '#4ade80',
      primary500: '#22c55e',
      primary600: '#16a34a',
      primary700: '#15803d',
      primary800: '#166534',
      primary900: '#14532d',
      primary950: '#052e16',
      // Custom money green aliases
      moneyGreen: '#16a34a',
      moneyGreenDark: '#15803d',
      moneyGreenLight: '#22c55e',
      moneyGreenLighter: '#bbf7d0',
      moneyGreenLightest: '#f0fdf4',
    },
  },
};
