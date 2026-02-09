import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { getTheme, gluestackThemeConfig } from './src/styles/theme';

function AppContent() {
  const { isDarkMode } = useContext(ThemeContext);
  const currentTheme = getTheme(isDarkMode);

  return (
    <GluestackUIProvider config={gluestackThemeConfig}>
      <PaperProvider theme={currentTheme}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </PaperProvider>
    </GluestackUIProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
