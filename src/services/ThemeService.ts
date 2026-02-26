import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, type ColorPalette } from '../styles/theme';

const THEME_KEY = '@theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

interface CategoryColor {
  color: string;
  light: string;
}

interface StatusColor {
  color: string;
  label: string;
}

const ThemeService = {
  /**
   * Get the current theme mode setting.
   */
  async getThemeMode(): Promise<ThemeMode> {
    try {
      const mode = await AsyncStorage.getItem(THEME_KEY);
      return (mode as ThemeMode) || 'light';
    } catch (error) {
      console.error('Failed to get theme mode:', error);
      return 'light';
    }
  },

  /**
   * Set the theme mode.
   */
  async setThemeMode(mode: ThemeMode): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (error) {
      console.error('Failed to set theme mode:', error);
    }
  },

  /**
   * Toggle between light and dark mode.
   */
  async toggleTheme(): Promise<ThemeMode> {
    const currentMode = await this.getThemeMode();
    const newMode: ThemeMode = currentMode === 'dark' ? 'light' : 'dark';
    await this.setThemeMode(newMode);
    return newMode;
  },

  /**
   * Check if dark mode is active.
   */
  async isDarkMode(): Promise<boolean> {
    const mode = await this.getThemeMode();
    return mode === 'dark';
  },

  /**
   * Get the current color palette.
   */
  async getColors(): Promise<ColorPalette> {
    const isDark = await this.isDarkMode();
    return getColors(isDark);
  },

  /**
   * Get category colors for charts and UI.
   */
  getCategoryColors(): CategoryColor[] {
    return [
      { color: '#ef4444', light: '#fee2e2' }, // Food & Dining
      { color: '#3b82f6', light: '#dbeafe' }, // Transportation
      { color: '#f59e0b', light: '#fef3c7' }, // Shopping
      { color: '#8b5cf6', light: '#ede9fe' }, // Entertainment
      { color: '#06b6d4', light: '#cffafe' }, // Bills & Utilities
      { color: '#ec4899', light: '#fce7f3' }, // Healthcare
      { color: '#10b981', light: '#d1fae5' }, // Education
      { color: '#64748b', light: '#f1f5f9' }, // Other
    ];
  },

  /**
   * Get a specific category color by index.
   */
  getCategoryColor(index: number): CategoryColor {
    const categoryColors = this.getCategoryColors();
    return categoryColors[index % categoryColors.length];
  },

  /**
   * Get status colors for budget tracking.
   */
  getStatusColors(): StatusColor[] {
    return [
      { color: '#10b981', label: 'On Track' },
      { color: '#f59e0b', label: 'Warning' },
      { color: '#ef4444', label: 'Over Budget' },
    ];
  },

  /**
   * Get status color based on budget percentage.
   */
  getStatusColor(percentage: number): StatusColor {
    if (percentage >= 90) return { color: '#ef4444', label: 'Over Budget' };
    if (percentage >= 70) return { color: '#f59e0b', label: 'Warning' };
    return { color: '#10b981', label: 'On Track' };
  },

  /**
   * Get chart colors for analytics.
   */
  getChartColors(): string[] {
    return [
      '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#ec4899', '#10b981', '#64748b',
      '#f97316', '#14b8a6', '#a855f7', '#0ea5e9',
    ];
  },
};

export default ThemeService;
