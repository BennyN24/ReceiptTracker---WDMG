import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import AppNavigator from './src/navigation/AppNavigator';
import { theme, gluestackThemeConfig } from './src/styles/theme';

export default function App() {
  return (
    <GluestackUIProvider config={gluestackThemeConfig}>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </PaperProvider>
    </GluestackUIProvider>
  );
}
