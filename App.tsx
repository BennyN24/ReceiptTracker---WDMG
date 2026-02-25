import React, { useContext, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { getTheme, gluestackThemeConfig } from './src/styles/theme';
import NotificationService from './src/services/NotificationService';
import RecurringExpenseService from './src/services/RecurringExpenseService';
import { StorageService } from './src/services/StorageService';
import LocationService from './src/services/LocationService';
import AdService from './src/services/AdService';
import InterstitialAdManager from './src/services/InterstitialAdManager';
import type { AppSettings } from './src/types';

function AppContent() {
  const themeContext = useContext(ThemeContext);
  if (!themeContext) return null;

  const { isDarkMode } = themeContext;
  const currentTheme = getTheme(isDarkMode);

  useEffect(() => {
    let isMounted = true;

    const initNotifications = async () => {
      try {
        const settings: AppSettings = await StorageService.getSettings();
        if (!isMounted) return;
        
        if (settings?.notifications) {
          const granted = await NotificationService.initialize();
          if (!isMounted) return;
          
          if (granted) {
            // Schedule recurring notifications
            await NotificationService.scheduleDailySummary(20, 0);
            await NotificationService.scheduleWeeklyReview(2, 10, 0);

            // Check for recurring expenses due today
            const dueExpenses = await RecurringExpenseService.getExpensesDueToday();
            if (!isMounted) return;
            
            if (dueExpenses.length > 0) {
              await NotificationService.sendExpenseReminder();
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Notification init error:', error);
        }
      }
    };

    const initLocationCurrency = async () => {
      try {
        const settings: AppSettings = await StorageService.getSettings();
        if (!isMounted) return;

        // Only auto-detect if enabled and not yet attempted
        if (settings.autoDetectCurrency && !settings.locationDetectionAttempted) {
          const result = await LocationService.detectCurrency();
          if (!isMounted) return;

          if (result) {
            const updatedSettings: AppSettings = {
              ...settings,
              currency: result.currencyCode,
              locationDetectionAttempted: true,
              detectedCountryCode: result.countryCode,
            };
            await StorageService.saveSettings(updatedSettings);
          } else {
            // Mark as attempted even if detection failed
            await StorageService.saveSettings({
              ...settings,
              locationDetectionAttempted: true,
            });
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Location currency detection error:', error);
        }
      }
    };

    const initAds = async () => {
      try {
        await AdService.initialize();
        if (!isMounted) return;
        await InterstitialAdManager.initialize();
        if (!isMounted) return;
        await InterstitialAdManager.loadInterstitialAd();
      } catch (error) {
        if (isMounted) {
          console.error('Ad initialization error:', error);
        }
      }
    };

    (async () => {
      try {
        await Promise.all([
          initNotifications(),
          initLocationCurrency(),
          initAds(),
        ]);
      } catch (error) {
        if (isMounted) {
          console.error('Initialization error:', error);
        }
      }
    })();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
      InterstitialAdManager.dispose();
    };
  }, []);

  return (
    <GluestackUIProvider config={gluestackThemeConfig}>
      {/* @ts-ignore - currentTheme type might have minor incompatibilities with Paper's expectation but it's fundamentally correct */}
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
      <ProfileProvider>
        <AppContent />
        <Toast />
      </ProfileProvider>
    </ThemeProvider>
  );
}
