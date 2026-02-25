import { DefaultTheme, MD3DarkTheme } from 'react-native-paper';
import { config as gluestackConfig } from '@gluestack-ui/config';

// ─── Color Palette Types ────────────────────────────────────

export interface ColorPalette {
  primary: string;
  primaryDark: string;
  primaryDarker: string;
  primaryLight: string;
  primaryLighter: string;
  primaryLightest: string;
  primaryMuted: string;
  background: string;
  backgroundSecondary: string;
  surface: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  white: string;
  black: string;
  [key: string]: string;
}

// Light Mode Color Palette
export const lightColors: ColorPalette = {
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

// Dark Mode Color Palette
export const darkColors: ColorPalette = {
  primary: '#22c55e',       // green-500 (brighter for dark mode)
  primaryDark: '#16a34a',   // green-600
  primaryDarker: '#15803d', // green-700
  primaryLight: '#4ade80',  // green-400
  primaryLighter: '#166534',// green-800
  primaryLightest: '#052e16',// green-950
  primaryMuted: '#15803d',  // green-700
  background: '#0f172a',    // slate-900
  backgroundSecondary: '#1e293b', // slate-800
  surface: '#1e293b',       // slate-800
  text: '#f1f5f9',          // slate-100 for maximum contrast on dark backgrounds
  textSecondary: '#cbd5e1', // slate-300
  textMuted: '#94a3b8',     // slate-400
  border: '#334155',        // slate-700
  borderLight: '#475569',   // slate-600
  error: '#f87171',         // red-400
  success: '#4ade80',       // green-400
  warning: '#fbbf24',       // amber-400
  info: '#60a5fa',          // blue-400
  white: '#ffffff',
  black: '#000000',
};

// Default to light colors
export const colors: ColorPalette = lightColors;

export const getColors = (isDarkMode: boolean): ColorPalette =>
  isDarkMode ? darkColors : lightColors;

// React Native Paper theme (light mode)
export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: lightColors.primary,
    accent: lightColors.primaryLight,
    background: lightColors.background,
    surface: lightColors.surface,
    text: lightColors.text,
    textSecondary: lightColors.textSecondary,
    border: lightColors.border,
    error: lightColors.error,
    success: lightColors.success,
    warning: lightColors.warning,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700' as const,
    },
  },
  roundness: 12,
  animation: {
    scale: 1.0,
    useNativeDriver: false,
  },
};

// React Native Paper theme (dark mode)
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    accent: darkColors.primaryLight,
    background: darkColors.background,
    surface: darkColors.surface,
    text: darkColors.text,
    textSecondary: darkColors.textSecondary,
    border: darkColors.border,
    error: darkColors.error,
    success: darkColors.success,
    warning: darkColors.warning,
  },
  fonts: {
    ...MD3DarkTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700' as const,
    },
  },
  roundness: 12,
  animation: {
    scale: 1.0,
    useNativeDriver: false,
  },
};

// Default to light theme
export const theme = lightTheme;

export const getTheme = (isDarkMode: boolean) =>
  isDarkMode ? darkTheme : lightTheme;

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
