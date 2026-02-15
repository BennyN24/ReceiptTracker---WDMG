import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dimensions,
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
import StorageService from '../services/StorageService';
import AnalyticsService from '../services/AnalyticsService';
import CurrencyService from '../services/CurrencyService';
import { useThemeColors } from '../hooks/useThemeColors';

const { width } = Dimensions.get('window');

const AnalyticsScreen = () => {
  const colors = useThemeColors();
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [settings, setSettings] = useState({ currency: 'USD' });
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [topVendors, setTopVendors] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getDateRange = useCallback((periodType) => {
    const now = new Date();
    let startDate, endDate;

    endDate = now.toISOString().split('T')[0];

    switch (periodType) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0];
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1)
          .toISOString()
          .split('T')[0];
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
          .toISOString()
          .split('T')[0];
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
    }

    return { startDate, endDate };
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const expensesData = await StorageService.getExpenses();
      const budgetsData = await StorageService.getBudgets();
      const settingsData = await StorageService.getSettings();

      setExpenses(expensesData);
      setBudgets(budgetsData);
      setSettings(settingsData);

      const { startDate, endDate } = getDateRange(period);

      const statsData = AnalyticsService.getSpendingStats(
        expensesData,
        startDate,
        endDate
      );
      setStats(statsData);

      const categoryData = AnalyticsService.getSpendingByCategory(
        expensesData,
        startDate,
        endDate
      );
      setByCategory(categoryData);

      const vendorsData = AnalyticsService.getTopVendors(
        expensesData,
        5,
        startDate,
        endDate
      );
      setTopVendors(vendorsData);

      const insightsData = AnalyticsService.getInsights(
        expensesData,
        budgetsData,
        startDate,
        endDate
      );
      setInsights(insightsData);
    } catch (error) {
      console.error('Load analytics error:', error);
    } finally {
      setLoading(false);
    }
  }, [period, getDateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  }, [loadAnalytics]);

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency || 'USD',
    }).format(amount);
  }, [settings.currency]);

  const renderStatCard = useCallback((label, value, color) => (
    <Box mb="$3" bg={colors.white} borderRadius="$xl" p="$4" borderLeftWidth={4} borderLeftColor={color} shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
      <Text fontSize="$sm" color={colors.textSecondary} mb="$1">{label}</Text>
      <Text fontSize="$xl" fontWeight="$bold" color={color}>
        {formatCurrency(typeof value === 'number' ? value : 0)}
      </Text>
    </Box>
  ), [formatCurrency]);

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg={colors.backgroundSecondary}>
        <Spinner size="large" color={colors.primary} />
        <Text mt="$3" color={colors.textSecondary}>Loading analytics...</Text>
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
        <Heading size="xl" color={colors.text}>Analytics</Heading>
      </Box>

      {/* Period Selector */}
      <HStack px="$4" py="$3" space="sm">
        {[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'quarter', label: 'Quarter' },
          { value: 'year', label: 'Year' },
        ].map((item) => (
          <Pressable
            key={item.value}
            flex={1}
            onPress={() => setPeriod(item.value)}
            bg={period === item.value ? colors.primary : colors.white}
            borderWidth={1}
            borderColor={period === item.value ? colors.primary : colors.border}
            borderRadius="$lg"
            py="$2.5"
            alignItems="center"
          >
            <Text
              fontSize="$sm"
              fontWeight="$medium"
              color={period === item.value ? colors.white : colors.textSecondary}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </HStack>

      {stats && (
        <VStack px="$4" py="$3">
          <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$3">
            Spending Summary
          </Text>
          {renderStatCard('Total Spending', stats.total, colors.error)}
          {renderStatCard('Average Transaction', stats.average, colors.info)}
          {renderStatCard('Highest Transaction', stats.max, colors.warning)}
          <Box mb="$3" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
            <Text fontSize="$sm" color={colors.textSecondary} mb="$1">Transaction Count</Text>
            <Text fontSize="$xl" fontWeight="$bold" color={colors.text}>{stats.count}</Text>
          </Box>
        </VStack>
      )}

      {byCategory.length > 0 && (
        <VStack px="$4" py="$3">
          <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$3">
            Spending by Category
          </Text>
          {byCategory.map((item, index) => (
            <Box key={index} mb="$2" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.04} shadowRadius={3} elevation={1}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack flex={1} mr="$3">
                  <Text fontSize="$md" color={colors.text} mb="$1.5">{item.category}</Text>
                  <Box h={6} bg={colors.border} borderRadius="$full" overflow="hidden">
                    <Box
                      h="100%"
                      bg={colors.primary}
                      borderRadius="$full"
                      w={`${Math.min((item.amount / (stats?.total || 1)) * 100, 100)}%`}
                    />
                  </Box>
                </VStack>
                <Text fontSize="$md" fontWeight="$semibold" color={colors.text}>{formatCurrency(item.amount)}</Text>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}

      {topVendors.length > 0 && (
        <VStack px="$4" py="$3">
          <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$3">
            Top Vendors
          </Text>
          {topVendors.map((vendor, index) => (
            <Box key={index} mb="$2" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.04} shadowRadius={3} elevation={1}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack flex={1}>
                  <Text fontSize="$md" color={colors.text} mb="$1">{vendor.vendor}</Text>
                  <Text fontSize="$sm" color={colors.textSecondary}>
                    {vendor.count} transactions • Avg: {formatCurrency(vendor.average)}
                  </Text>
                </VStack>
                <Text fontSize="$md" fontWeight="$semibold" color={colors.text}>{formatCurrency(vendor.amount)}</Text>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}

      {insights.length > 0 && (
        <VStack px="$4" py="$3">
          <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$3">
            Insights
          </Text>
          {insights.map((insight, index) => (
            <Box
              key={index}
              mb="$2"
              bg={colors.white}
              borderRadius="$xl"
              p="$4"
              borderLeftWidth={4}
              borderLeftColor={insight.severity === 'warning' ? colors.warning : colors.info}
              shadowColor={colors.black}
              shadowOffset={{ width: 0, height: 1 }}
              shadowOpacity={0.04}
              shadowRadius={3}
              elevation={1}
            >
              <Text fontSize="$sm" fontWeight="$semibold" color={colors.text} mb="$1">{insight.title}</Text>
              <Text fontSize="$sm" color={colors.textSecondary}>{insight.message}</Text>
            </Box>
          ))}
        </VStack>
      )}

      <Box px="$4" py="$3">
        <Pressable
          onPress={() => {
            const { startDate, endDate } = getDateRange(period);
            const csv = AnalyticsService.exportAnalyticsAsCSV(
              expenses,
              startDate,
              endDate
            );
            if (csv) {
              console.log('CSV exported:', csv);
            }
          }}
          borderWidth={1.5}
          borderColor={colors.primary}
          borderRadius="$lg"
          py="$3"
          alignItems="center"
        >
          <Text color={colors.primary} fontWeight="$semibold" fontSize="$md">Export as CSV</Text>
        </Pressable>
      </Box>

      <Box h={20} />
    </ScrollView>
  );
};

export default AnalyticsScreen;
