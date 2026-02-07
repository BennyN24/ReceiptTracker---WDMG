import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Card,
  Button,
  ProgressBar,
  Surface,
  Divider,
} from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialIcons';
import { StorageService } from '../services/StorageService';

const DashboardScreen = ({ navigation }) => {
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expensesData, budgetsData, settingsData] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getBudgets(),
        StorageService.getSettings(),
      ]);
      
      setExpenses(expensesData);
      setBudgets(budgetsData);
      setSettings(settingsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

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
    const budgetLimit = settings.monthlyBudget || 1550;
    return Math.min((totalSpent / budgetLimit) * 100, 100);
  }, [getTotalSpent, settings.monthlyBudget]);

  const getRecentExpenses = useMemo(() => {
    return expenses
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [expenses]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const totalSpent = getTotalSpent;
  const budgetPercentage = getBudgetPercentage;
  const recentExpenses = getRecentExpenses;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Where Did my Money Go!</Text>
        <Text style={styles.subtitle}>Welcome back, your finances are on track.</Text>
      </View>

      {/* Budget Overview Card */}
      <Card style={styles.budgetCard}>
        <Card.Content>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetTitle}>Monthly Budget</Text>
            <Text style={styles.budgetAmount}>
              {formatCurrency(totalSpent)} / {formatCurrency(settings.monthlyBudget || 1550)}
            </Text>
          </View>
          <ProgressBar
            progress={budgetPercentage / 100}
            color={budgetPercentage > 80 ? '#ef4444' : '#10b981'}
            style={styles.progressBar}
          />
          <Text style={styles.budgetPercentage}>
            {budgetPercentage.toFixed(1)}% of budget used
          </Text>
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Surface style={styles.statCard}>
          <View style={styles.statContent}>
            <Icon name="trending-up" size={24} color="#ef4444" />
            <Text style={styles.statValue}>{getCurrentMonthExpenses().length}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
        </Surface>
        
        <Surface style={styles.statCard}>
          <View style={styles.statContent}>
            <Icon name="account-balance-wallet" size={24} color="#10b981" />
            <Text style={styles.statValue}>
              {formatCurrency((settings.monthlyBudget || 1550) - totalSpent)}
            </Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </Surface>
      </View>

      {/* Recent Expenses */}
      <Card style={styles.recentCard}>
        <Card.Content>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Expenses</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <Divider style={styles.divider} />
          
          {recentExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="receipt" size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Capture')}
                style={styles.addFirstButton}
              >
                Add Your First Expense
              </Button>
            </View>
          ) : (
            recentExpenses.map((expense) => (
              <View key={expense.id} style={styles.expenseItem}>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseVendor}>{expense.vendor}</Text>
                  <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
                </View>
                <Text style={styles.expenseAmount}>
                  {formatCurrency(expense.amount)}
                </Text>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Capture')}
          style={styles.actionButton}
          icon="camera"
        >
          Capture Receipt
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Expenses')}
          style={styles.actionButton}
          icon="add"
        >
          Add Expense
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  budgetCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#ffffff',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  budgetPercentage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  recentCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#ffffff',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  viewAllText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
    marginBottom: 20,
  },
  addFirstButton: {
    backgroundColor: '#6366f1',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseVendor: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 14,
    color: '#64748b',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 4,
  },
});

export default DashboardScreen;
