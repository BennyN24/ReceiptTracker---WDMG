import React, { useState, useEffect } from 'react';
import {
  Alert,
  Switch,
  Modal,
  FlatList,
  RefreshControl,
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
import CurrencyService from '../services/CurrencyService';
import { colors } from '../styles/theme';

const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState('');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencies, setCurrencies] = useState([]);

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

  const handleExportData = async () => {
    try {
      const [expenses, budgets] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getBudgets(),
      ]);

      const exportData = {
        expenses,
        budgets,
        settings,
        exportDate: new Date().toISOString(),
      };

      // In a real app, you'd share this data or save to a file
      Alert.alert(
        'Export Data',
        'Data exported successfully! (In a real app, this would save to a file or share)',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
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
            onValueChange={(value) => updateSetting('notifications', value)}
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
            value={settings.darkMode}
            onValueChange={(value) => updateSetting('darkMode', value)}
            trackColor={{ false: '#e2e8f0', true: colors.primaryLighter }}
            thumbColor={settings.darkMode ? colors.primary : '#ffffff'}
          />
        </HStack>
      </Box>

      {/* Data Management */}
      <Box mx="$4" mt="$4" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$4">Data Management</Text>
        
        <Pressable onPress={handleExportData} py="$3">
          <HStack justifyContent="space-between" alignItems="center">
            <HStack alignItems="center" flex={1}>
              <Icon name="file-download" size={24} color={colors.primary} />
              <VStack ml="$3" flex={1}>
                <Text fontWeight="$medium" fontSize="$md" color={colors.text} mb="$1">Export Data</Text>
                <Text fontSize="$sm" color={colors.textSecondary}>
                  Download all your expenses and budgets
                </Text>
              </VStack>
            </HStack>
            <Icon name="chevron-right" size={24} color={colors.textMuted} />
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

      {/* About */}
      <Box mx="$4" mt="$4" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$4">About</Text>
        
        <HStack justifyContent="space-between" alignItems="center" py="$2">
          <Text fontSize="$md" color={colors.textSecondary}>App Version</Text>
          <Text fontSize="$md" color={colors.text} fontWeight="$medium">1.0.0</Text>
        </HStack>

        <HStack justifyContent="space-between" alignItems="center" py="$2">
          <Text fontSize="$md" color={colors.textSecondary}>Developer</Text>
          <Text fontSize="$md" color={colors.text} fontWeight="$medium">Receipt Tracker Pro</Text>
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
