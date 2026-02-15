import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@receipt_tracker_theme';

const lightTheme = {
  dark: false,
  colors: {
    primary: '#6366f1',
    primaryContainer: '#e0e7ff',
    secondary: '#8b5cf6',
    secondaryContainer: '#ede9fe',
    tertiary: '#ec4899',
    tertiaryContainer: '#fce7f3',
    error: '#ef4444',
    errorContainer: '#fee2e2',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceVariant: '#f1f5f9',
    outline: '#cbd5e1',
    outlineVariant: '#e2e8f0',
    scrim: '#000000',
    inverseSurface: '#1e293b',
    inverseOnSurface: '#f8fafc',
    inversePrimary: '#a5b4fc',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#4f46e5',
    onSecondary: '#ffffff',
    onSecondaryContainer: '#6d28d9',
    onTertiary: '#ffffff',
    onTertiaryContainer: '#be185d',
    onError: '#ffffff',
    onErrorContainer: '#991b1b',
    onBackground: '#1e293b',
    onSurface: '#1e293b',
    onSurfaceVariant: '#64748b',
  },
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    disabled: '#cbd5e1',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

const darkTheme = {
  dark: true,
  colors: {
    primary: '#a5b4fc',
    primaryContainer: '#4f46e5',
    secondary: '#d8b4fe',
    secondaryContainer: '#6d28d9',
    tertiary: '#f472b6',
    tertiaryContainer: '#be185d',
    error: '#fca5a5',
    errorContainer: '#7f1d1d',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceVariant: '#334155',
    outline: '#64748b',
    outlineVariant: '#475569',
    scrim: '#000000',
    inverseSurface: '#f8fafc',
    inverseOnSurface: '#0f172a',
    inversePrimary: '#6366f1',
    onPrimary: '#312e81',
    onPrimaryContainer: '#e0e7ff',
    onSecondary: '#4c1d95',
    onSecondaryContainer: '#ede9fe',
    onTertiary: '#831843',
    onTertiaryContainer: '#fce7f3',
    onError: '#4f1f1f',
    onErrorContainer: '#fee2e2',
    onBackground: '#f8fafc',
    onSurface: '#f8fafc',
    onSurfaceVariant: '#cbd5e1',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    disabled: '#64748b',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

const ThemeService = {
  /**
   * Get current theme
   */
  async getCurrentTheme() {
    try {
      const theme = await AsyncStorage.getItem(THEME_KEY);
      return theme === 'dark' ? darkTheme : lightTheme;
    } catch (error) {
      console.error('Get current theme error:', error);
      return lightTheme;
    }
  },

  /**
   * Get theme mode (light or dark)
   */
  async getThemeMode() {
    try {
      const mode = await AsyncStorage.getItem(THEME_KEY);
      return mode || 'light';
    } catch (error) {
      console.error('Get theme mode error:', error);
      return 'light';
    }
  },

  /**
   * Set theme mode
   */
  async setThemeMode(mode) {
    try {
      if (!['light', 'dark'].includes(mode)) {
        throw new Error('Invalid theme mode');
      }
      await AsyncStorage.setItem(THEME_KEY, mode);
      return mode === 'dark' ? darkTheme : lightTheme;
    } catch (error) {
      console.error('Set theme mode error:', error);
      return lightTheme;
    }
  },

  /**
   * Toggle theme
   */
  async toggleTheme() {
    try {
      const currentMode = await this.getThemeMode();
      const newMode = currentMode === 'light' ? 'dark' : 'light';
      return await this.setThemeMode(newMode);
    } catch (error) {
      console.error('Toggle theme error:', error);
      return lightTheme;
    }
  },

  /**
   * Get light theme
   */
  getLightTheme() {
    return lightTheme;
  },

  /**
   * Get dark theme
   */
  getDarkTheme() {
    return darkTheme;
  },

  /**
   * Get category color
   */
  getCategoryColor(category) {
    const colors = {
      'Food & Dining': '#ef4444',
      'Transportation': '#3b82f6',
      'Shopping': '#8b5cf6',
      'Entertainment': '#ec4899',
      'Bills & Utilities': '#f59e0b',
      'Healthcare': '#10b981',
      'Education': '#06b6d4',
      'Other': '#6b7280',
    };

    return colors[category] || '#6b7280';
  },

  /**
   * Get status color
   */
  getStatusColor(status, theme = 'light') {
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    };

    return colors[status] || '#6b7280';
  },

  /**
   * Get text color based on theme
   */
  getTextColor(type = 'primary', theme = 'light') {
    const themeObj = theme === 'dark' ? darkTheme : lightTheme;
    return themeObj.text[type] || themeObj.text.primary;
  },

  /**
   * Get background color based on theme
   */
  getBackgroundColor(theme = 'light') {
    const themeObj = theme === 'dark' ? darkTheme : lightTheme;
    return themeObj.colors.background;
  },

  /**
   * Get surface color based on theme
   */
  getSurfaceColor(theme = 'light') {
    const themeObj = theme === 'dark' ? darkTheme : lightTheme;
    return themeObj.colors.surface;
  },
};

export default ThemeService;
export { lightTheme, darkTheme };
