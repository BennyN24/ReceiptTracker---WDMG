import React, { useState, useEffect, useContext } from 'react';
import {
  Alert,
  Switch,
  Modal,
  FlatList,
  RefreshControl,
  Linking,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Heading,
  Pressable,
  ScrollView,
  Input,
  InputField,
  Divider,
  Spinner,
} from '@gluestack-ui/themed';
import Icon from '@expo/vector-icons/MaterialIcons';
import { StorageService } from '../services/StorageService';
import ExportService from '../services/ExportService';
import CurrencyService from '../services/CurrencyService';
import NotificationService from '../services/NotificationService';
import BiometricService from '../services/BiometricService';
import { getColors } from '../styles/theme';
import { ThemeContext } from '../context/ThemeContext';

const SettingsScreen = ({ navigation }) => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const colors = getColors(isDarkMode);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState('');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsData = await StorageService.getSettings();
      setSettings(settingsData);
      setTempBudget(settingsData.monthlyBudget?.toString() || '1550');
      const currencyList = CurrencyService.getAllCurrencies();
      setCurrencies(currencyList);
      const bioAvailable = await BiometricService.isBiometricAvailable();
      setBiometricAvailable(bioAvailable);
      const bioEnabled = await BiometricService.isBiometricEnabled();
      setBiometricEnabled(bioEnabled);
    } catch (error) {
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const updateSetting = async (key, value) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      await StorageService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleSaveBudget = async () => {
    const budgetAmount = parseFloat(tempBudget);
    
    if (!tempBudget || isNaN(budgetAmount) || budgetAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    await updateSetting('monthlyBudget', budgetAmount);
    setEditingBudget(false);
    Alert.alert('Success', 'Monthly budget updated successfully');
  };

  const handleCurrencyChange = async (currencyCode) => {
    try {
      await updateSetting('currency', currencyCode);
      setShowCurrencyModal(false);
      Alert.alert('Success', `Currency changed to ${currencyCode}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to change currency');
    }
  };

  const handleBiometricToggle = async (value) => {
    try {
      if (value) {
        const available = await BiometricService.isBiometricAvailable();
        if (!available) {
          Alert.alert(
            'Biometric Not Available',
            'Your device does not support biometric authentication or no biometrics are enrolled. Please set up biometrics in your device settings first.'
          );
          return;
        }

        // Verify biometric works before enabling
        const result = await BiometricService.enableBiometric();
        if (result) {
          setBiometricEnabled(true);
          await updateSetting('biometricAuth', true);
          Alert.alert('Success', 'Biometric authentication enabled. You will be prompted to authenticate when opening the app.');
        } else {
          Alert.alert('Error', 'Failed to enable biometric authentication');
        }
      } else {
        const result = await BiometricService.disableBiometric();
        if (result) {
          setBiometricEnabled(false);
          await updateSetting('biometricAuth', false);
          Alert.alert('Success', 'Biometric authentication disabled');
        } else {
          Alert.alert('Error', 'Failed to disable biometric authentication');
        }
      }
    } catch (error) {
      console.error('Toggle biometric error:', error);
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    const isAvailable = await ExportService.isSharingAvailable();
    if (!isAvailable) {
      Alert.alert('Unavailable', 'Sharing is not supported on this device.');
      return;
    }

    Alert.alert(
      'Export Data',
      'Choose an export format:',
      [
        {
          text: 'JSON (Full Backup)',
          onPress: () => performExport('json'),
        },
        {
          text: 'CSV (Expenses Only)',
          onPress: () => performExport('csv'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const performExport = async (format) => {
    setExporting(true);
    try {
      if (format === 'json') {
        await ExportService.exportAsJSON();
      } else {
        await ExportService.exportAsCSV();
      }
    } catch (error) {
      Alert.alert('Export Failed', error.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your expenses, budgets, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.saveExpenses([]);
              await StorageService.saveBudgets([]);
              await StorageService.saveSettings(StorageService.getDefaultSettings());
              await loadSettings();
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount, currency = null) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || settings.currency || 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg={colors.backgroundSecondary}>
        <Spinner size="large" color={colors.primary} />
        <Text mt="$3" color={colors.textSecondary}>Loading settings...</Text>
      </Box>
    );
  }

  return (
    <ScrollView
      bg={colors.backgroundSecondary}
      pt="$8"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <Box px="$5" pt="$10" pb="$4" bg={colors.white} borderBottomWidth={1} borderBottomColor={colors.border}>
        <Heading size="2xl" color={colors.text} mb="$1">Settings</Heading>
        <Text color={colors.textSecondary} fontSize="$md">Manage your app preferences</Text>
      </Box>

      {/* Budget Settings */}
      <Box mx="$4" mt="$4" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$4">Budget Settings</Text>
        
        <HStack justifyContent="space-between" alignItems="center" py="$2">
          <VStack flex={1} mr="$4">
            <Text fontWeight="$medium" fontSize="$md" color={colors.text} mb="$1">Monthly Budget</Text>
            <Text fontSize="$md" color={colors.primary} fontWeight="$semibold">
              {formatCurrency(settings.monthlyBudget || 1550)}
            </Text>
          </VStack>
          <Pressable
            onPress={() => setEditingBudget(true)}
            borderWidth={1.5}
            borderColor={colors.primary}
            borderRadius="$lg"
            px="$4"
            py="$2"
          >
            <Text color={colors.primary} fontWeight="$medium" fontSize="$sm">Edit</Text>
          </Pressable>
        </HStack>

        {editingBudget && (
          <VStack mt="$4" pt="$4" borderTopWidth={1} borderTopColor={colors.border}>
            <Input borderRadius="$lg" borderColor={colors.border} mb="$3">
              <InputField
                placeholder="Monthly Budget Amount"
                value={tempBudget}
                onChangeText={(text) => {
                  // Only allow numeric input with decimal point
                  const numericValue = text.replace(/[^0-9.]/g, '');
                  // Ensure only one decimal point
                  const parts = numericValue.split('.');
                  if (parts.length > 2) {
                    setTempBudget(parts[0] + '.' + parts[1]);
                  } else {
                    setTempBudget(numericValue);
                  }
                }}
                keyboardType="numeric"
                fontSize="$md"
              />
            </Input>
            <HStack space="md">
              <Pressable
                onPress={handleSaveBudget}
                bg={colors.primary}
                borderRadius="$lg"
                px="$5"
                py="$2.5"
              >
                <Text color={colors.white} fontWeight="$semibold">Save</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setEditingBudget(false);
                  setTempBudget(settings.monthlyBudget?.toString() || '1550');
                }}
                px="$5"
                py="$2.5"
              >
                <Text color={colors.textSecondary} fontWeight="$medium">Cancel</Text>
              </Pressable>
            </HStack>
          </VStack>
        )}
      </Box>

      {/* App Preferences */}
      <Box mx="$4" mt="$4" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$4">App Preferences</Text>
        
        <HStack justifyContent="space-between" alignItems="center" py="$2">
          <VStack flex={1} mr="$4">
            <Text fontWeight="$medium" fontSize="$md" color={colors.text} mb="$1">Preferred Currency</Text>
            <Text fontSize="$md" color={colors.primary} fontWeight="$semibold">
              {settings.currency || 'USD'} ({CurrencyService.getSymbol(settings.currency || 'USD')})
            </Text>
          </VStack>
          <Pressable
            onPress={() => setShowCurrencyModal(true)}
            borderWidth={1.5}
            borderColor={colors.primary}
            borderRadius="$lg"
            px="$4"
            py="$2"
          >
            <Text color={colors.primary} fontWeight="$medium" fontSize="$sm">Change</Text>
          </Pressable>
        </HStack>

        <Divider my="$4" />
        
        <HStack justifyContent="space-between" alignItems="center" py="$2">
          <VStack flex={1} mr="$4">
            <Text fontWeight="$medium" fontSize="$md" color={colors.text} mb="$1">Push Notifications</Text>
            <Text fontSize="$sm" color={colors.textSecondary}>
              Get alerts for budget limits and reminders
            </Text>
          </VStack>
          <Switch
            value={settings.notifications}
            onValueChange={async (value) => {
              if (value) {
                const granted = await NotificationService.initialize();
                if (!granted) {
                  Alert.alert(
                    'Permissions Required',
                    'Please enable notifications in your device settings to receive budget alerts and reminders.'
                  );
                  return;
                }
                await updateSetting('notifications', true);
                await NotificationService.scheduleDailySummary(20, 0);
                await NotificationService.scheduleWeeklyReview(2, 10, 0);
              } else {
                await NotificationService.cancelAllNotifications();
                await updateSetting('notifications', false);
              }
            }}
            trackColor={{ false: '#e2e8f0', true: colors.primaryLighter }}
            thumbColor={settings.notifications ? colors.primary : '#ffffff'}
          />
        </HStack>

        <Divider my="$4" />

        <HStack justifyContent="space-between" alignItems="center" py="$2">
          <VStack flex={1} mr="$4">
            <Text fontWeight="$medium" fontSize="$md" color={colors.text} mb="$1">Dark Mode</Text>
            <Text fontSize="$sm" color={colors.textSecondary}>
              Use dark theme across the app
            </Text>
          </VStack>
          <Switch
            value={isDarkMode}
            onValueChange={(value) => toggleDarkMode(value)}
            trackColor={{ false: '#e2e8f0', true: colors.primaryLighter }}
            thumbColor={isDarkMode ? colors.primary : '#ffffff'}
          />
        </HStack>

        <Divider my="$4" />

        <HStack justifyContent="space-between" alignItems="center" py="$2">
          <VStack flex={1} mr="$4">
            <Text fontWeight="$medium" fontSize="$md" color={colors.text} mb="$1">Biometric Authentication</Text>
            <Text fontSize="$sm" color={colors.textSecondary}>
              {biometricAvailable
                ? 'Use fingerprint or face recognition to lock the app'
                : 'Biometric authentication is not available on this device'}
            </Text>
          </VStack>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            disabled={!biometricAvailable}
            trackColor={{ false: '#e2e8f0', true: colors.primaryLighter }}
            thumbColor={biometricEnabled ? colors.primary : '#ffffff'}
          />
        </HStack>
      </Box>

      {/* Data Management */}
      <Box mx="$4" mt="$4" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$4">Data Management</Text>
        
        <Pressable onPress={handleExportData} py="$3" disabled={exporting} opacity={exporting ? 0.5 : 1}>
          <HStack justifyContent="space-between" alignItems="center">
            <HStack alignItems="center" flex={1}>
              <Icon name="file-download" size={24} color={colors.primary} />
              <VStack ml="$3" flex={1}>
                <Text fontWeight="$medium" fontSize="$md" color={colors.text} mb="$1">
                  {exporting ? 'Exporting...' : 'Export Data'}
                </Text>
                <Text fontSize="$sm" color={colors.textSecondary}>
                  Download all your expenses and budgets
                </Text>
              </VStack>
            </HStack>
            {exporting ? (
              <Spinner size="small" color={colors.primary} />
            ) : (
              <Icon name="chevron-right" size={24} color={colors.textMuted} />
            )}
          </HStack>
        </Pressable>

        <Divider my="$4" />

        <Pressable onPress={handleClearData} py="$3">
          <HStack justifyContent="space-between" alignItems="center">
            <HStack alignItems="center" flex={1}>
              <Icon name="delete-forever" size={24} color={colors.error} />
              <VStack ml="$3" flex={1}>
                <Text fontWeight="$medium" fontSize="$md" color={colors.error} mb="$1">
                  Clear All Data
                </Text>
                <Text fontSize="$sm" color={colors.textSecondary}>
                  Permanently delete all expenses and budgets
                </Text>
              </VStack>
            </HStack>
            <Icon name="chevron-right" size={24} color={colors.textMuted} />
          </HStack>
        </Pressable>
      </Box>

      {/* Feedback & Support */}
      <Box mx="$4" mt="$4" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$4">Feedback & Support</Text>

        <Pressable
          onPress={() => {
            Linking.openURL('mailto:benny@bennys-bio.site?subject=Feedback%20-%20Receipt%20Tracker%20v1.0.0').catch(() =>
              Alert.alert('Error', 'Unable to open email client. Please email us at benny@bennys-bio.site')
            );
          }}
          py="$3"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <HStack alignItems="center" flex={1}>
              <Icon name="email" size={24} color={colors.primary} />
              <VStack ml="$3" flex={1}>
                <Text fontWeight="$medium" fontSize="$md" color={colors.text} mb="$1">Send Feedback</Text>
                <Text fontSize="$sm" color={colors.textSecondary}>
                  Share your thoughts or suggestions with us
                </Text>
              </VStack>
            </HStack>
            <Icon name="chevron-right" size={24} color={colors.textMuted} />
          </HStack>
        </Pressable>

        <Divider my="$4" />

        <Pressable
          onPress={() => {
            Linking.openURL('mailto:benny@bennys-bio.site?subject=Bug%20Report%20-%20Receipt%20Tracker%20v1.0.0&body=Please%20describe%20the%20issue%20below%3A%0A%0ASteps%20to%20reproduce%3A%0A1.%20%0A2.%20%0A3.%20%0A%0AExpected%20behavior%3A%0A%0AActual%20behavior%3A').catch(() =>
              Alert.alert('Error', 'Unable to open email client. Please email us at benny@bennys-bio.site')
            );
          }}
          py="$3"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <HStack alignItems="center" flex={1}>
              <Icon name="bug-report" size={24} color={colors.warning} />
              <VStack ml="$3" flex={1}>
                <Text fontWeight="$medium" fontSize="$md" color={colors.text} mb="$1">Report a Bug</Text>
                <Text fontSize="$sm" color={colors.textSecondary}>
                  Let us know about any issues you encounter
                </Text>
              </VStack>
            </HStack>
            <Icon name="chevron-right" size={24} color={colors.textMuted} />
          </HStack>
        </Pressable>

        <Divider my="$4" />

        <Pressable
          onPress={() => {
            Alert.alert(
              'Rate Receipt Tracker',
              'Enjoying the app? Please rate us on the App Store or Google Play!',
              [
                { text: 'Not Now', style: 'cancel' },
                {
                  text: 'Rate Now',
                  onPress: () => {
                    // Replace with actual store URLs when published
                    Alert.alert('Thank You!', 'Store listing coming soon. We appreciate your support!');
                  },
                },
              ]
            );
          }}
          py="$3"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <HStack alignItems="center" flex={1}>
              <Icon name="star" size={24} color={colors.warning} />
              <VStack ml="$3" flex={1}>
                <Text fontWeight="$medium" fontSize="$md" color={colors.text} mb="$1">Rate the App</Text>
                <Text fontSize="$sm" color={colors.textSecondary}>
                  Help us improve by leaving a review
                </Text>
              </VStack>
            </HStack>
            <Icon name="chevron-right" size={24} color={colors.textMuted} />
          </HStack>
        </Pressable>
      </Box>

      {/* About */}
      <Box mx="$4" mt="$4" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$4">About</Text>
        
        <HStack justifyContent="space-between" alignItems="center" py="$2">
          <Text fontSize="$md" color={colors.textSecondary}>App Version</Text>
          <Text fontSize="$md" color={colors.text} fontWeight="$medium">1.0.0</Text>
        </HStack>

        <HStack justifyContent="space-between" alignItems="center" py="$2">
          <Text fontSize="$md" color={colors.textSecondary}>Developer</Text>
          <Text fontSize="$md" color={colors.text} fontWeight="$medium">Receipt Tracker - Benny N.</Text>
        </HStack>
      </Box>

      <Box h={20} />

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <Box flex={1} bg="rgba(0, 0, 0, 0.5)" justifyContent="flex-end">
          <Box bg={colors.white} borderTopLeftRadius="$2xl" borderTopRightRadius="$2xl" maxHeight="80%" pt="$4">
            <HStack justifyContent="space-between" alignItems="center" px="$5" pb="$4" borderBottomWidth={1} borderBottomColor={colors.border}>
              <Text fontWeight="$semibold" fontSize="$lg" color={colors.text}>Select Currency</Text>
              <Pressable onPress={() => setShowCurrencyModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </Pressable>
            </HStack>
            
            <FlatList
              data={currencies}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleCurrencyChange(item.code)}
                  px="$5"
                  py="$4"
                  borderBottomWidth={1}
                  borderBottomColor={colors.border}
                  bg={settings.currency === item.code ? colors.primaryLightest : colors.white}
                >
                  <HStack justifyContent="space-between" alignItems="center">
                    <VStack flex={1}>
                      <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$1">{item.code}</Text>
                      <Text fontSize="$sm" color={colors.textSecondary}>{item.name}</Text>
                    </VStack>
                    <Text fontWeight="$semibold" fontSize="$lg" color={colors.primary} mx="$3">{item.symbol}</Text>
                    {settings.currency === item.code && (
                      <Icon name="check" size={24} color={colors.primary} />
                    )}
                  </HStack>
                </Pressable>
              )}
              keyExtractor={(item) => item.code}
              scrollEnabled={true}
            />
          </Box>
        </Box>
      </Modal>
    </ScrollView>
  );
};

export default SettingsScreen;
