import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Text,
  SegmentedButtons,
  Button,
} from 'react-native-paper';
import StorageService from '../services/StorageService';
import AnalyticsService from '../services/AnalyticsService';
import CurrencyService from '../services/CurrencyService';

const { width } = Dimensions.get('window');

const AnalyticsScreen = () => {
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

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
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
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const getDateRange = (periodType) => {
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
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency || 'USD',
    }).format(amount);
  };

  const renderStatCard = (label, value, color = '#6366f1') => (
    <Card style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Card.Content>
        <Text variant="bodySmall" style={styles.statLabel}>
          {label}
        </Text>
        <Text variant="headlineSmall" style={[styles.statValue, { color }]}>
          {formatCurrency(typeof value === 'number' ? value : 0)}
        </Text>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading analytics...</Text>
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
          Analytics
        </Text>
      </View>

      <View style={styles.periodSelector}>
        <SegmentedButtons
          value={period}
          onValueChange={setPeriod}
          buttons={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' },
          ]}
        />
      </View>

      {stats && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Spending Summary
          </Text>
          {renderStatCard('Total Spending', stats.total, '#ef4444')}
          {renderStatCard('Average Transaction', stats.average, '#3b82f6')}
          {renderStatCard('Highest Transaction', stats.max, '#f59e0b')}
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.statLabel}>
                Transaction Count
              </Text>
              <Text variant="headlineSmall" style={styles.statValue}>
                {stats.count}
              </Text>
            </Card.Content>
          </Card>
        </View>
      )}

      {byCategory.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Spending by Category
          </Text>
          {byCategory.map((item, index) => (
            <Card key={index} style={styles.categoryCard}>
              <Card.Content>
                <View style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <Text variant="bodyMedium" style={styles.categoryName}>
                      {item.category}
                    </Text>
                    <View style={styles.categoryBar}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            width: `${Math.min(
                              (item.amount / (stats?.total || 1)) * 100,
                              100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text variant="bodyMedium" style={styles.categoryAmount}>
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      {topVendors.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Top Vendors
          </Text>
          {topVendors.map((vendor, index) => (
            <Card key={index} style={styles.vendorCard}>
              <Card.Content>
                <View style={styles.vendorRow}>
                  <View style={styles.vendorInfo}>
                    <Text variant="bodyMedium" style={styles.vendorName}>
                      {vendor.vendor}
                    </Text>
                    <Text variant="bodySmall" style={styles.vendorMeta}>
                      {vendor.count} transactions • Avg: {formatCurrency(vendor.average)}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.vendorAmount}>
                    {formatCurrency(vendor.amount)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      {insights.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Insights
          </Text>
          {insights.map((insight, index) => (
            <Card
              key={index}
              style={[
                styles.insightCard,
                {
                  borderLeftColor:
                    insight.severity === 'warning' ? '#f59e0b' : '#3b82f6',
                  borderLeftWidth: 4,
                },
              ]}
            >
              <Card.Content>
                <Text variant="labelMedium" style={styles.insightTitle}>
                  {insight.title}
                </Text>
                <Text variant="bodySmall" style={styles.insightMessage}>
                  {insight.message}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Button
          mode="outlined"
          onPress={() => {
            const csv = AnalyticsService.exportAnalyticsAsCSV(
              expenses,
              getDateRange(period).startDate,
              getDateRange(period).endDate
            );
            if (csv) {
              console.log('CSV exported:', csv);
            }
          }}
        >
          Export as CSV
        </Button>
      </View>

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
  periodSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    color: '#1e293b',
    fontWeight: '600',
  },
  statCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  statLabel: {
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    color: '#1e293b',
    fontWeight: '700',
  },
  categoryCard: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    color: '#1e293b',
    marginBottom: 6,
  },
  categoryBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  categoryAmount: {
    color: '#1e293b',
    fontWeight: '600',
  },
  vendorCard: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  vendorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    color: '#1e293b',
    marginBottom: 4,
  },
  vendorMeta: {
    color: '#64748b',
  },
  vendorAmount: {
    color: '#1e293b',
    fontWeight: '600',
  },
  insightCard: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  insightTitle: {
    color: '#1e293b',
    marginBottom: 4,
    fontWeight: '600',
  },
  insightMessage: {
    color: '#64748b',
  },
  spacer: {
    height: 20,
  },
});

export default AnalyticsScreen;
