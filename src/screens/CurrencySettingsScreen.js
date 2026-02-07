import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Text,
  RadioButton,
  Button,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CurrencyService from '../services/CurrencyService';

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
    <Card style={styles.currencyCard}>
      <Card.Content>
        <View style={styles.currencyRow}>
          <View style={styles.currencyInfo}>
            <Text variant="titleMedium" style={styles.currencyCode}>
              {item.code}
            </Text>
            <Text variant="bodySmall" style={styles.currencyName}>
              {item.name}
            </Text>
          </View>
          <View style={styles.currencySymbol}>
            <Text variant="headlineSmall">{item.symbol}</Text>
          </View>
          <RadioButton
            value={item.code}
            status={selectedCurrency === item.code ? 'checked' : 'unchecked'}
            onPress={() => handleCurrencyChange(item.code)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading currencies...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} tintColor="#6366f1" />
      }
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Currency Settings
        </Text>
      </View>

      <Card style={styles.infoCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.infoTitle}>
            Current Currency
          </Text>
          <View style={styles.currentCurrencyDisplay}>
            <Text variant="headlineMedium" style={styles.currentSymbol}>
              {CurrencyService.getSymbol(selectedCurrency)}
            </Text>
            <View style={styles.currentInfo}>
              <Text variant="titleMedium" style={styles.currentCode}>
                {selectedCurrency}
              </Text>
              <Text variant="bodySmall" style={styles.currentName}>
                {CurrencyService.getName(selectedCurrency)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Select Currency
        </Text>
        <FlatList
          data={currencies}
          renderItem={renderCurrencyItem}
          keyExtractor={item => item.code}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      </View>

      <Card style={styles.conversionCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.conversionTitle}>
            Exchange Rates (vs USD)
          </Text>
          <View style={styles.ratesList}>
            {currencies.slice(0, 5).map(currency => (
              <View key={currency.code} style={styles.rateRow}>
                <Text variant="bodySmall" style={styles.rateCode}>
                  {currency.code}
                </Text>
                <Text variant="bodySmall" style={styles.rateValue}>
                  1 USD = {(1 / currency.rate).toFixed(4)} {currency.code}
                </Text>
              </View>
            ))}
          </View>
          <Button
            mode="outlined"
            onPress={() => {
              Alert.alert(
                'Exchange Rates',
                'Exchange rates are updated periodically. Tap to refresh rates from the server.'
              );
            }}
            style={styles.refreshButton}
          >
            Refresh Rates
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.noteCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.noteTitle}>
            Note
          </Text>
          <Text variant="bodySmall" style={styles.noteText}>
            • All expenses will be displayed in your selected currency
          </Text>
          <Text variant="bodySmall" style={styles.noteText}>
            • Exchange rates are approximate and updated periodically
          </Text>
          <Text variant="bodySmall" style={styles.noteText}>
            • Historical expenses will use the rate at the time of entry
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: '#1e293b',
    fontWeight: '600',
  },
  infoCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#ffffff',
  },
  infoTitle: {
    color: '#64748b',
    marginBottom: 12,
  },
  currentCurrencyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  currentSymbol: {
    color: '#6366f1',
    marginRight: 16,
    fontWeight: '700',
  },
  currentInfo: {
    flex: 1,
  },
  currentCode: {
    color: '#1e293b',
  },
  currentName: {
    color: '#64748b',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    color: '#1e293b',
    marginBottom: 12,
    fontWeight: '600',
  },
  listContent: {
    gap: 8,
  },
  currencyCard: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    color: '#1e293b',
    fontWeight: '600',
  },
  currencyName: {
    color: '#64748b',
    marginTop: 2,
  },
  currencySymbol: {
    marginHorizontal: 12,
  },
  conversionCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#ffffff',
  },
  conversionTitle: {
    color: '#1e293b',
    marginBottom: 12,
    fontWeight: '600',
  },
  ratesList: {
    marginBottom: 12,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  rateCode: {
    color: '#1e293b',
    fontWeight: '500',
  },
  rateValue: {
    color: '#64748b',
  },
  refreshButton: {
    marginTop: 8,
  },
  noteCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#f0f9ff',
  },
  noteTitle: {
    color: '#0369a1',
    marginBottom: 8,
    fontWeight: '600',
  },
  noteText: {
    color: '#0369a1',
    marginVertical: 2,
  },
  spacer: {
    height: 20,
  },
});

export default CurrencySettingsScreen;
