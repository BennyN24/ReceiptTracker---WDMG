import React, { useContext, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { getTheme, gluestackThemeConfig } from './src/styles/theme';
import NotificationService from './src/services/NotificationService';
import RecurringExpenseService from './src/services/RecurringExpenseService';
import { StorageService } from './src/services/StorageService';
import LocationService from './src/services/LocationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

function AppContent() {
  const { isDarkMode } = useContext(ThemeContext);
  const currentTheme = getTheme(isDarkMode);

  useEffect(() => {
    const initNotifications = async () => {
      try {
        const settings = await StorageService.getSettings();
        if (settings.notifications) {
          const granted = await NotificationService.initialize();
          if (granted) {
            // Schedule recurring notifications
            await NotificationService.scheduleDailySummary(20, 0);
            await NotificationService.scheduleWeeklyReview(2, 10, 0);

            // Check for recurring expenses due today
            const dueExpenses = await RecurringExpenseService.getExpensesDueToday();
            if (dueExpenses.length > 0) {
              const names = dueExpenses.map(e => e.vendor).join(', ');
              await NotificationService.sendExpenseReminder(
                `You have ${dueExpenses.length} recurring expense(s) due today: ${names}`
              );
            }
          }
        }
      } catch (error) {
        console.error('Notification init error:', error);
      }
    };

    const initLocationCurrency = async () => {
      try {
        const settings = await StorageService.getSettings();

        // Only auto-detect if enabled and not yet attempted
        if (settings.autoDetectCurrency && !settings.locationDetectionAttempted) {
          const result = await LocationService.detectCurrency();

          if (result) {
            const updatedSettings = {
              ...settings,
              currency: result.currencyCode,
              locationDetectionAttempted: true,
              detectedCountryCode: result.countryCode,
            };
            await StorageService.saveSettings(updatedSettings);

            // Also update the CurrencySettingsScreen storage key
            await AsyncStorage.setItem('@receipt_tracker_currency', result.currencyCode);
          } else {
            // Mark as attempted even if detection failed
            await StorageService.saveSettings({
              ...settings,
              locationDetectionAttempted: true,
            });
          }
        }
      } catch (error) {
        console.error('Location currency detection error:', error);
      }
    };

    // Properly handle promises with explicit catch
    initNotifications().catch(error => {
      console.error('Unhandled error in initNotifications:', error);
    });
    
    initLocationCurrency().catch(error => {
      console.error('Unhandled error in initLocationCurrency:', error);
    });
  }, []);

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
      <Toast />
    </ThemeProvider>
  );
}
