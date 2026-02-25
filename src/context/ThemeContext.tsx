import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Context Shape ──────────────────────────────────────────

export interface ThemeContextValue {
  isDarkMode: boolean;
  toggleDarkMode: (value?: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  isDarkMode: false,
  toggleDarkMode: () => {},
});

// ─── Provider ───────────────────────────────────────────────

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async (): Promise<void> => {
    try {
      const saved = await AsyncStorage.getItem('@theme_preference');
      if (saved !== null) {
        setIsDarkMode(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const toggleDarkMode = useCallback(async (value?: boolean): Promise<void> => {
    const newValue = value !== undefined ? value : !isDarkMode;
    setIsDarkMode(newValue);
    try {
      await AsyncStorage.setItem('@theme_preference', JSON.stringify(newValue));
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
