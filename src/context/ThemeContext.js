import React, { createContext, useState, useEffect } from 'react';
import { StorageService } from '../services/StorageService';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const settings = await StorageService.getSettings();
      if (settings && typeof settings.darkMode === 'boolean') {
        setIsDarkMode(settings.darkMode);
      } else {
        setIsDarkMode(false);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      setIsDarkMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = async (value) => {
    try {
      setIsDarkMode(value);
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, darkMode: value });
    } catch (error) {
      console.error('Failed to update theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};
