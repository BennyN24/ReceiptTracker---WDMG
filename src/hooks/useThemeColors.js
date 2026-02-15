import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { getColors } from '../styles/theme';

export const useThemeColors = () => {
  const { isDarkMode } = useContext(ThemeContext);
  return getColors(isDarkMode);
};
