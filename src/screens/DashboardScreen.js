import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import {
  StyleSheet,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Heading,
  Pressable,
  ScrollView,
  Divider,
  Spinner,
  Progress,
  ProgressFilledTrack,
} from '@gluestack-ui/themed';
import { ProgressBar } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import AnalyticsService from '../services/AnalyticsService';
import CurrencyService from '../services/CurrencyService';
import { useThemeColors } from '../hooks/useThemeColors';
import { ThemeContext } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

const DashboardScreen = ({ navigation }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useContext(ThemeContext);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('monthly');

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = useCallback(async () => {
    try {
      const [expensesData, budgetsData, categoriesData, settingsData] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getBudgets(),
        StorageService.getCategories(),
        StorageService.getSettings(),
      ]);
      
      setExpenses(expensesData);
      setBudgets(budgetsData);
      setCategories(categoriesData);
      setSettings(settingsData);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load data',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getCurrentMonthExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    });
  }, [expenses]);

  const getTotalSpent = useMemo(() => {
    const currentMonthExpenses = getCurrentMonthExpenses;
    return currentMonthExpenses.reduce((total, expense) => total + expense.amount, 0);
  }, [getCurrentMonthExpenses]);

  const getBudgetPercentage = useMemo(() => {
    const totalSpent = getTotalSpent;
    const budgetLimit = settings.monthlyBudget || 5000;
    return Math.min((totalSpent / budgetLimit) * 100, 100);
  }, [getTotalSpent, settings.monthlyBudget]);

  const getRecentExpenses = useMemo(() => {
    return expenses
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [expenses]);

  const CHART_COLORS = [
    '#16a34a', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
  ];

  const categoryChartData = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    const byCategory = AnalyticsService.getSpendingByCategory(expenses, startDate, endDate);
    if (byCategory.length === 0) return [];

    const total = byCategory.reduce((sum, item) => sum + item.amount, 0);

    return byCategory.slice(0, 6).map((item, index) => {
      const categoryData = categories.find(cat => cat.id === item.category);
      return {
        name: categoryData?.name || item.category || 'Other',
        amount: parseFloat(item.amount.toFixed(2)),
        percentage: total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0',
        color: categoryData?.color || CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: '#64748b',
        legendFontSize: 12,
      };
    });
  }, [expenses, categories]);

  const getDailyTrendData = useMemo(() => {
    const now = new Date();
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayExpenses = expenses.filter(expense => expense.date === dateStr);
      const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      last7Days.push({
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        total: parseFloat(total.toFixed(2)),
      });
    }
    
    if (last7Days.every(day => day.total === 0)) return null;
    
    return {
      labels: last7Days.map(item => item.label),
      datasets: [
        {
          data: last7Days.map(item => item.total || 0),
        },
      ],
    };
  }, [expenses]);

  const getWeeklyTrendData = useMemo(() => {
    const now = new Date();
    const last4Weeks = [];
    
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];
      
      const weekExpenses = expenses.filter(expense => 
        expense.date >= startStr && expense.date <= endStr
      );
      const total = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      last4Weeks.push({
        label: `W${4 - i}`,
        total: parseFloat(total.toFixed(2)),
      });
    }
    
    if (last4Weeks.every(week => week.total === 0)) return null;
    
    return {
      labels: last4Weeks.map(item => item.label),
      datasets: [
        {
          data: last4Weeks.map(item => item.total || 0),
        },
      ],
    };
  }, [expenses]);

  const monthlyTrendData = useMemo(() => {
    const comparison = AnalyticsService.getMonthOverMonthComparison(expenses, 6);
    if (comparison.length === 0) return null;

    return {
      labels: comparison.map(item => item.month.split(' ')[0]),
      datasets: [
        {
          data: comparison.map(item => item.total || 0),
        },
      ],
    };
  }, [expenses]);

  const currentTrendData = useMemo(() => {
    switch (chartPeriod) {
      case 'daily':
        return getDailyTrendData;
      case 'weekly':
        return getWeeklyTrendData;
      case 'monthly':
      default:
        return monthlyTrendData;
    }
  }, [chartPeriod, getDailyTrendData, getWeeklyTrendData, monthlyTrendData]);

  const getChartTitle = () => {
    switch (chartPeriod) {
      case 'daily':
        return 'Daily Trend (Last 7 Days)';
      case 'weekly':
        return 'Weekly Trend (Last 4 Weeks)';
      case 'monthly':
      default:
        return 'Monthly Trend';
    }
  };

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency || 'USD',
    }).format(amount);
  }, [settings.currency]);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, []);

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg={colors.backgroundSecondary}>
        <Spinner size="large" color={colors.primary} />
        <Text mt="$3" color={colors.textSecondary} fontSize="$md">Loading...</Text>
      </Box>
    );
  }

  const totalSpent = getTotalSpent;
  const budgetPercentage = getBudgetPercentage;
  const recentExpenses = getRecentExpenses;

  return (
    <ScrollView
      bg={colors.backgroundSecondary}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <Box px="$5" pt="$16" pb="$4">
        <Heading size="2xl" color={isDarkMode ? '#ffffff' : colors.text} mb="$2">Track Expenses</Heading>
        <Text color={colors.textSecondary} fontSize="$md">Welcome back, your finances are on track.</Text>
      </Box>

      {/* Budget Overview Card */}
      <Box mx="$5" mb="$5" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.08} shadowRadius={8} elevation={3}>
        <HStack justifyContent="space-between" alignItems="center" mb="$3">
          <Text fontWeight="$semibold" fontSize="$lg" color={colors.text}>Monthly Budget</Text>
          <Text fontWeight="$semibold" fontSize="$md" color={colors.primary}>
            {formatCurrency(totalSpent)} / {formatCurrency(settings.monthlyBudget || 5000)}
          </Text>
        </HStack>
        <ProgressBar
          progress={budgetPercentage / 100}
          color={budgetPercentage > 80 ? colors.error : colors.primary}
          style={{ height: 8, borderRadius: 4, marginBottom: 8 }}
        />
        <Text fontSize="$sm" color={colors.textSecondary} textAlign="right">
          {budgetPercentage.toFixed(1)}% of budget used
        </Text>
      </Box>

      {/* Quick Stats */}
      <HStack px="$5" mb="$5" space="md">
        <Box flex={1} bg={colors.white} borderRadius="$xl" p="$4" alignItems="center" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
          <Box bg={colors.primaryLightest} borderRadius="$full" p="$2" mb="$2">
            <Icon name="trending-up" size={24} color={colors.error} />
          </Box>
          <Text fontWeight="$bold" fontSize="$xl" color={colors.text}>{getCurrentMonthExpenses.length}</Text>
          <Text fontSize="$xs" color={colors.textSecondary}>Transactions</Text>
        </Box>
        
        <Box flex={1} bg={colors.white} borderRadius="$xl" p="$4" alignItems="center" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
          <Box bg={colors.primaryLightest} borderRadius="$full" p="$2" mb="$2">
            <Icon name="account-balance-wallet" size={24} color={colors.primary} />
          </Box>
          <Text fontWeight="$bold" fontSize="$xl" color={colors.text}>
            {formatCurrency((settings.monthlyBudget || 5000) - totalSpent)}
          </Text>
          <Text fontSize="$xs" color={colors.textSecondary}>Remaining</Text>
        </Box>
      </HStack>

      {/* Recent Expenses */}
      <Box mx="$5" mb="$5" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.08} shadowRadius={8} elevation={3}>
        <HStack justifyContent="space-between" alignItems="center" mb="$4">
          <Text fontWeight="$semibold" fontSize="$lg" color={colors.text}>Recent Expenses</Text>
          <Pressable onPress={() => navigation.navigate('Expenses')}>
            <Text color={colors.primary} fontSize="$sm" fontWeight="$medium">View All</Text>
          </Pressable>
        </HStack>
        
        <Divider mb="$4" />
        
        {recentExpenses.length === 0 ? (
          <VStack alignItems="center" py="$8">
            <Icon name="receipt" size={48} color={colors.textMuted} />
            <Text fontSize="$md" color={colors.textSecondary} mt="$3" mb="$5">No expenses yet</Text>
            <Pressable
              onPress={() => navigation.navigate('Capture')}
              bg={colors.primary}
              borderRadius="$lg"
              px="$6"
              py="$3"
            >
              <Text color={colors.white} fontWeight="$semibold">Add Your First Expense</Text>
            </Pressable>
          </VStack>
        ) : (
          recentExpenses.map((expense) => (
            <Pressable key={expense.id} onPress={() => navigation.navigate('Expenses')}>
              <HStack justifyContent="space-between" alignItems="center" py="$3" borderBottomWidth={1} borderBottomColor={colors.borderLight}>
                <VStack flex={1}>
                  <Text fontWeight="$medium" fontSize="$md" color={colors.text} mb="$1">{expense.vendor}</Text>
                  <Text fontSize="$sm" color={colors.textSecondary}>{formatDate(expense.date)}</Text>
                </VStack>
                <Text fontWeight="$semibold" fontSize="$md" color={colors.error}>
                  {formatCurrency(expense.amount)}
                </Text>
              </HStack>
            </Pressable>
          ))
        )}
      </Box>

      {/* Quick Actions */}
      <HStack px="$5" pb="$5" space="md">
        <Pressable
          onPress={() => navigation.navigate('Capture')}
          bg={colors.primary}
          borderRadius="$lg"
          py="$3.5"
          flex={1}
          alignItems="center"
          flexDirection="row"
          justifyContent="center"
        >
          <Icon name="camera-alt" size={20} color={colors.white} />
          <Text color={colors.white} fontWeight="$semibold" fontSize="$md" ml="$2">Capture Receipt</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('Expenses')}
          borderWidth={1.5}
          borderColor={colors.primary}
          borderRadius="$lg"
          py="$3.5"
          flex={1}
          alignItems="center"
          flexDirection="row"
          justifyContent="center"
        >
          <Icon name="add" size={20} color={colors.primary} />
          <Text color={colors.primary} fontWeight="$semibold" fontSize="$md" ml="$2">Add Expense</Text>
        </Pressable>
      </HStack>

      {/* Spending by Category - Pie Chart */}
      {categoryChartData.length > 0 && (
        <Box mx="$5" mb="$5" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.08} shadowRadius={8} elevation={3}>
          <HStack justifyContent="space-between" alignItems="center" mb="$4">
            <Text fontWeight="$semibold" fontSize="$lg" color={colors.text}>Spending by Category</Text>
            
          </HStack>
          <PieChart
            data={categoryChartData}
            width={screenWidth - 56}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute={false}
          />
          <HStack flexWrap="wrap" mt="$2" space="sm">
            {categoryChartData.map((item, index) => (
              <HStack key={index} alignItems="center" mr="$1">
                <Box w={10} h={10} borderRadius="$full" bg={item.color} mr="$1.5" />
                <Text fontSize="$xs" color={colors.textSecondary}>
                  {item.name}: {item.percentage}%
                </Text>
              </HStack>
            ))}
          </HStack>
        </Box>
      )}

      {/* Spending Trend - Bar Chart with Period Toggle */}
      {currentTrendData && (
        <Box mx="$5" mb="$5" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.08} shadowRadius={8} elevation={3}>
          <VStack space="md">
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontWeight="$semibold" fontSize="$lg" color={colors.text}>{getChartTitle()}</Text>
            </HStack>
            
            {/* Period Toggle Buttons */}
            <HStack space="xs" justifyContent="center">
              <Pressable
                onPress={() => setChartPeriod('daily')}
                bg={chartPeriod === 'daily' ? colors.primary : colors.backgroundSecondary}
                borderRadius="$lg"
                px="$4"
                py="$2"
                flex={1}
                alignItems="center"
              >
                <Text
                  color={chartPeriod === 'daily' ? colors.white : colors.textSecondary}
                  fontWeight={chartPeriod === 'daily' ? '$semibold' : '$normal'}
                  fontSize="$sm"
                >
                  Daily
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => setChartPeriod('weekly')}
                bg={chartPeriod === 'weekly' ? colors.primary : colors.backgroundSecondary}
                borderRadius="$lg"
                px="$4"
                py="$2"
                flex={1}
                alignItems="center"
              >
                <Text
                  color={chartPeriod === 'weekly' ? colors.white : colors.textSecondary}
                  fontWeight={chartPeriod === 'weekly' ? '$semibold' : '$normal'}
                  fontSize="$sm"
                >
                  Weekly
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => setChartPeriod('monthly')}
                bg={chartPeriod === 'monthly' ? colors.primary : colors.backgroundSecondary}
                borderRadius="$lg"
                px="$4"
                py="$2"
                flex={1}
                alignItems="center"
              >
                <Text
                  color={chartPeriod === 'monthly' ? colors.white : colors.textSecondary}
                  fontWeight={chartPeriod === 'monthly' ? '$semibold' : '$normal'}
                  fontSize="$sm"
                >
                  Monthly
                </Text>
              </Pressable>
            </HStack>
            
            <Box alignItems="center">
              <BarChart
                data={currentTrendData}
                width={screenWidth - 80}
                height={220}
                yAxisLabel={CurrencyService.getSymbol(settings.currency || 'USD')}
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(51, 65, 85, ${opacity})`,
                  barPercentage: 0.6,
                  propsForBackgroundLines: {
                    strokeDasharray: '4 4',
                    stroke: '#e2e8f0',
                    strokeWidth: 1,
                  },
                  propsForLabels: {
                    fontSize: 12,
                  },
                }}
                style={{ borderRadius: 8 }}
                fromZero
                showValuesOnTopOfBars
                withInnerLines={true}
              />
            </Box>
          </VStack>
        </Box>
      )}

      {/* Empty Analytics State */}
      {categoryChartData.length === 0 && (
        <Box mx="$5" mb="$5" bg={colors.white} borderRadius="$xl" p="$8" alignItems="center" shadowColor={colors.black} shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.08} shadowRadius={8} elevation={3}>
          <Icon name="pie-chart" size={48} color={colors.textMuted} />
          <Text fontSize="$sm" color={colors.textMuted} mt="$3" textAlign="center">
            Add expenses to see your spending analytics
          </Text>
        </Box>
      )}

    </ScrollView>
  );
};

export default DashboardScreen;
