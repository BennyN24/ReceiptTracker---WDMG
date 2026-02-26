import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { getColors, ColorPalette } from '../styles/theme';

export const useThemeColors = (): ColorPalette => {
  const { isDarkMode } = useContext(ThemeContext);
  return getColors(isDarkMode);
};
