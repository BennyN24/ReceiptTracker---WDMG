import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import {
  Card,
  Button,
  TextInput,
  ProgressBar,
  FAB,
  Portal,
  Appbar,
  Divider,
} from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialIcons';
import { StorageService } from '../services/StorageService';

const BudgetsScreen = ({ navigation }) => {
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({ currency: 'USD' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newBudget, setNewBudget] = useState({
    name: '',
    amount: '',
    period: 'monthly',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [budgetsData, expensesData, settingsData] = await Promise.all([
        StorageService.getBudgets(),
        StorageService.getExpenses(),
        StorageService.getSettings(),
      ]);
      
      setBudgets(budgetsData);
      setExpenses(expensesData);
      setSettings(settingsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPeriodExpenses = useMemo(() => {
    return (period, budgetDate) => {
      const now = new Date();
      
      return expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        
        if (period === 'monthly') {
          return expenseDate.getMonth() === now.getMonth() && 
                 expenseDate.getFullYear() === now.getFullYear();
        } else if (period === 'weekly') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return expenseDate >= weekAgo;
        } else if (period === 'yearly') {
          return expenseDate.getFullYear() === now.getFullYear();
        }
        
        return false;
      });
    };
  }, [expenses]);

  const getBudgetSpent = useMemo(() => {
    return (budget) => {
      const periodExpenses = getCurrentPeriodExpenses(budget.period, budget.createdAt);
      return periodExpenses.reduce((total, expense) => total + expense.amount, 0);
    };
  }, [getCurrentPeriodExpenses]);

  const getBudgetPercentage = useMemo(() => {
    return (budget) => {
      const spent = getBudgetSpent(budget);
      return Math.min((spent / budget.amount) * 100, 100);
    };
  }, [getBudgetSpent]);

  const handleAddBudget = async () => {
    const budgetAmount = parseFloat(newBudget.amount);
    
    if (!newBudget.name.trim()) {
      Alert.alert('Error', 'Budget name is required');
      return;
    }
    
    if (!newBudget.amount || isNaN(budgetAmount) || budgetAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    try {
      await StorageService.addBudget({
        name: newBudget.name.trim(),
        amount: budgetAmount,
        period: newBudget.period,
      });
      
      setNewBudget({ name: '', amount: '', period: 'monthly' });
      setShowAddModal(false);
      await loadData();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add budget');
    }
  };

  const handleDeleteBudget = (budgetId) => {
    Alert.alert(
      'Delete Budget',
      'Are you sure you want to delete this budget?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteBudget(budgetId);
              await loadData();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete budget');
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

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  const renderBudgetItem = useMemo(() => {
    return (budget) => {
      const spent = getBudgetSpent(budget);
      const percentage = getBudgetPercentage(budget);
      const remaining = budget.amount - spent;
      const progressColor = getProgressColor(percentage);

      return (
        <Card key={budget.id} style={styles.budgetCard}>
          <Card.Content>
            <View style={styles.budgetHeader}>
              <View style={styles.budgetInfo}>
                <Text style={styles.budgetName}>{budget.name}</Text>
                <Text style={styles.budgetPeriod}>
                  {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteBudget(budget.id)}
                style={styles.deleteButton}
              >
                <Icon name="delete" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.budgetAmounts}>
              <Text style={styles.budgetSpent}>{formatCurrency(spent)}</Text>
              <Text style={styles.budgetTotal}>/ {formatCurrency(budget.amount)}</Text>
            </View>

            <ProgressBar
              progress={percentage / 100}
              color={progressColor}
              style={styles.progressBar}
            />

            <View style={styles.budgetStats}>
              <Text style={[styles.budgetPercentage, { color: progressColor }]}>
                {percentage.toFixed(1)}% used
              </Text>
              <Text style={[
                styles.budgetRemaining,
                remaining < 0 && styles.overBudget
              ]}>
                {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}
              </Text>
            </View>
          </Card.Content>
        </Card>
      );
    };
  }, [getBudgetSpent, getBudgetPercentage, getProgressColor, formatCurrency, handleDeleteBudget]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="account-balance-wallet" size={64} color="#94a3b8" />
      <Text style={styles.emptyTitle}>No budgets yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first budget to start tracking your spending
      </Text>
      <Button
        mode="contained"
        onPress={() => setShowAddModal(true)}
        style={styles.addButton}
        icon="plus"
      >
        Create Your First Budget
      </Button>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading budgets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Budgets</Text>
        <Text style={styles.subtitle}>Track your spending limits</Text>
      </View>

      {/* Budgets List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {budgets.length === 0 ? (
          renderEmptyState()
        ) : (
          budgets.map(renderBudgetItem)
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      />

      {/* Add Budget Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalContainer}>
            <Appbar.Header style={styles.modalHeader}>
              <Appbar.Action icon="close" onPress={() => setShowAddModal(false)} />
              <Appbar.Content title="Create Budget" />
              <Appbar.Action icon="check" onPress={handleAddBudget} />
            </Appbar.Header>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Budget Name</Text>
                <TextInput
                  label="e.g. Monthly Expenses"
                  value={newBudget.name}
                  onChangeText={(text) => setNewBudget({ ...newBudget, name: text })}
                  mode="outlined"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Budget Amount ($)</Text>
                <TextInput
                  label="0.00"
                  value={newBudget.amount}
                  onChangeText={(text) => {
                    // Only allow numeric input with decimal point
                    const numericValue = text.replace(/[^0-9.]/g, '');
                    // Ensure only one decimal point
                    const parts = numericValue.split('.');
                    if (parts.length > 2) {
                      setNewBudget({ ...newBudget, amount: parts[0] + '.' + parts[1] });
                    } else {
                      setNewBudget({ ...newBudget, amount: numericValue });
                    }
                  }}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Period</Text>
                <View style={styles.periodContainer}>
                  {['weekly', 'monthly', 'yearly'].map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodChip,
                        newBudget.period === period && styles.periodChipSelected,
                      ]}
                      onPress={() => setNewBudget({ ...newBudget, period })}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          newBudget.period === period && styles.periodTextSelected,
                        ]}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalButtonContainer}>
                <Button
                  mode="contained"
                  onPress={handleAddBudget}
                  style={styles.saveButton}
                >
                  Create Budget
                </Button>
                <Button
                  mode="text"
                  onPress={() => setShowAddModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </Portal>
    </View>
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  budgetCard: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  budgetPeriod: {
    fontSize: 14,
    color: '#64748b',
  },
  deleteButton: {
    padding: 4,
  },
  budgetAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  budgetSpent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  budgetTotal: {
    fontSize: 16,
    color: '#64748b',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetPercentage: {
    fontSize: 14,
    fontWeight: '500',
  },
  budgetRemaining: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  overBudget: {
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#6366f1',
  },
  bottomPadding: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6366f1',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  periodChipSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  periodTextSelected: {
    color: '#ffffff',
  },
  modalButtonContainer: {
    marginTop: 32,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#6366f1',
  },
  cancelButton: {
    borderColor: '#e2e8f0',
  },
});

export default BudgetsScreen;
