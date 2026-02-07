import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Alert,
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
  Spinner,
} from '@gluestack-ui/themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CurrencyService from '../services/CurrencyService';
import { colors } from '../styles/theme';

const CURRENCY_KEY = '@receipt_tracker_currency';

const CurrencySettingsScreen = () => {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCurrencySettings();
  }, []);

  const loadCurrencySettings = async () => {
    try {
      setLoading(true);
      const saved = await AsyncStorage.getItem(CURRENCY_KEY);
      if (saved) {
        setSelectedCurrency(saved);
      }

      const currencyList = CurrencyService.getAllCurrencies();
      setCurrencies(currencyList);
    } catch (error) {
      console.error('Load currency settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCurrencySettings();
    setRefreshing(false);
  };

  const handleCurrencyChange = async (currencyCode) => {
    try {
      await AsyncStorage.setItem(CURRENCY_KEY, currencyCode);
      setSelectedCurrency(currencyCode);
      Alert.alert('Success', `Currency changed to ${currencyCode}`);
    } catch (error) {
      console.error('Change currency error:', error);
      Alert.alert('Error', 'Failed to change currency');
    }
  };

  const renderCurrencyItem = ({ item }) => (
    <Pressable
      onPress={() => handleCurrencyChange(item.code)}
      mb="$2"
      bg={selectedCurrency === item.code ? colors.primaryLightest : colors.white}
      borderRadius="$xl"
      p="$4"
      borderWidth={selectedCurrency === item.code ? 1.5 : 0}
      borderColor={colors.primary}
      shadowColor={colors.black}
      shadowOffset={{ width: 0, height: 1 }}
      shadowOpacity={0.04}
      shadowRadius={3}
      elevation={1}
    >
      <HStack justifyContent="space-between" alignItems="center">
        <VStack flex={1}>
          <Text fontWeight="$semibold" fontSize="$md" color={colors.text}>{item.code}</Text>
          <Text fontSize="$sm" color={colors.textSecondary} mt="$0.5">{item.name}</Text>
        </VStack>
        <Text fontSize="$xl" fontWeight="$bold" mx="$3">{item.symbol}</Text>
        <Box w={24} h={24} borderRadius="$full" borderWidth={2} borderColor={selectedCurrency === item.code ? colors.primary : colors.border} alignItems="center" justifyContent="center">
          {selectedCurrency === item.code && (
            <Box w={14} h={14} borderRadius="$full" bg={colors.primary} />
          )}
        </Box>
      </HStack>
    </Pressable>
  );

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg={colors.backgroundSecondary}>
        <Spinner size="large" color={colors.primary} />
        <Text mt="$3" color={colors.textSecondary}>Loading currencies...</Text>
      </Box>
    );
  }

  return (
    <ScrollView
      bg={colors.backgroundSecondary}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      <Box px="$4" pt="$4" pb="$2">
        <Heading size="xl" color={colors.text}>Currency Settings</Heading>
      </Box>

      {/* Current Currency */}
      <Box mx="$4" my="$3" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <Text fontSize="$sm" color={colors.textSecondary} mb="$3">Current Currency</Text>
        <HStack alignItems="center" py="$2">
          <Text fontSize="$3xl" fontWeight="$bold" color={colors.primary} mr="$4">
            {CurrencyService.getSymbol(selectedCurrency)}
          </Text>
          <VStack flex={1}>
            <Text fontWeight="$semibold" fontSize="$lg" color={colors.text}>{selectedCurrency}</Text>
            <Text fontSize="$sm" color={colors.textSecondary} mt="$0.5">
              {CurrencyService.getName(selectedCurrency)}
            </Text>
          </VStack>
        </HStack>
      </Box>

      {/* Select Currency */}
      <VStack px="$4" py="$3">
        <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$3">Select Currency</Text>
        <FlatList
          data={currencies}
          renderItem={renderCurrencyItem}
          keyExtractor={item => item.code}
          scrollEnabled={false}
        />
      </VStack>

      {/* Exchange Rates */}
      <Box mx="$4" my="$3" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$3">Exchange Rates (vs USD)</Text>
        <VStack mb="$3">
          {currencies.slice(0, 5).map(currency => (
            <HStack key={currency.code} justifyContent="space-between" py="$1.5" borderBottomWidth={1} borderBottomColor={colors.border}>
              <Text fontSize="$sm" fontWeight="$medium" color={colors.text}>{currency.code}</Text>
              <Text fontSize="$sm" color={colors.textSecondary}>
                1 USD = {(1 / currency.rate).toFixed(4)} {currency.code}
              </Text>
            </HStack>
          ))}
        </VStack>
        <Pressable
          onPress={() => {
            Alert.alert(
              'Exchange Rates',
              'Exchange rates are updated periodically. Tap to refresh rates from the server.'
            );
          }}
          borderWidth={1.5}
          borderColor={colors.primary}
          borderRadius="$lg"
          py="$2.5"
          alignItems="center"
          mt="$2"
        >
          <Text color={colors.primary} fontWeight="$medium" fontSize="$sm">Refresh Rates</Text>
        </Pressable>
      </Box>

      {/* Note */}
      <Box mx="$4" my="$3" bg={colors.primaryLightest} borderRadius="$xl" p="$4">
        <Text fontWeight="$semibold" fontSize="$md" color={colors.primaryDark} mb="$2">Note</Text>
        <Text fontSize="$sm" color={colors.primaryDark} my="$0.5">• All expenses will be displayed in your selected currency</Text>
        <Text fontSize="$sm" color={colors.primaryDark} my="$0.5">• Exchange rates are approximate and updated periodically</Text>
        <Text fontSize="$sm" color={colors.primaryDark} my="$0.5">• Historical expenses will use the rate at the time of entry</Text>
      </Box>

      <Box h={20} />
    </ScrollView>
  );
};

export default CurrencySettingsScreen;
