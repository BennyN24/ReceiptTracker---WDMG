import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Alert,
  Modal,
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
  Spinner,
  Divider,
} from '@gluestack-ui/themed';
import { ProgressBar, Portal } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import { useThemeColors } from '../hooks/useThemeColors';
import AddBudgetModal from '../components/AddBudgetModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const BudgetsScreen = ({ navigation }) => {
  const colors = useThemeColors();
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({ currency: 'USD' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBudgetId, setDeletingBudgetId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [budgetsData, expensesData, categoriesData, settingsData] = await Promise.all([
        StorageService.getBudgets(),
        StorageService.getExpenses(),
        StorageService.getAllCategories(),
        StorageService.getSettings(),
      ]);
      
      setBudgets(budgetsData);
      setExpenses(expensesData);
      setCategories(categoriesData);
      setSettings(settingsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getCurrentPeriodExpenses = useCallback((period, budgetDate) => {
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
  }, [expenses]);

  const getBudgetSpent = useCallback((budget) => {
    const periodExpenses = getCurrentPeriodExpenses(budget.period, budget.createdAt);
    const categoryExpenses = budget.categoryId
      ? periodExpenses.filter(expense => expense.category === budget.categoryId)
      : periodExpenses;
    return categoryExpenses.reduce((total, expense) => total + expense.amount, 0);
  }, [getCurrentPeriodExpenses]);

  const getBudgetPercentage = useCallback((budget) => {
    const spent = getBudgetSpent(budget);
    return Math.min((spent / budget.amount) * 100, 100);
  }, [getBudgetSpent]);

  const handleEditBudget = useCallback((budget) => {
    setEditingBudget(budget);
    setShowAddModal(true);
  }, []);

  const handleDeleteBudget = useCallback((budgetId) => {
    setDeletingBudgetId(budgetId);
    setShowDeleteModal(true);
  }, []);

  const handleAddBudget = async (budgetData) => {
    try {
      if (editingBudget) {
        await StorageService.updateBudget(editingBudget.id, budgetData);
      } else {
        await StorageService.addBudget(budgetData);
      }
      
      setShowAddModal(false);
      setEditingBudget(null);
      await loadData();
    } catch (error) {
      Alert.alert('Error', editingBudget ? 'Failed to update budget' : 'Failed to add budget');
    }
  };


  const handleConfirmDelete = async () => {
    try {
      await StorageService.deleteBudget(deletingBudgetId);
      await loadData();
      setShowDeleteModal(false);
      setDeletingBudgetId(null);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete budget');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingBudgetId(null);
  };

  const formatCurrency = useCallback((amount, currency = null) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || settings.currency || 'USD',
    }).format(amount);
  }, [settings.currency]);

  const getProgressColor = useCallback((percentage) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  }, []);

  const getCategoryForBudget = useCallback((budget) => {
    return categories.find(c => c.id === budget.categoryId);
  }, [categories]);

  const renderBudgetItem = useCallback((budget) => {
    const spent = getBudgetSpent(budget);
    const percentage = getBudgetPercentage(budget);
    const remaining = budget.amount - spent;
    const progressColor = getProgressColor(percentage);
    const category = getCategoryForBudget(budget);

    return (
      <Pressable key={budget.id} onPress={() => handleEditBudget(budget)}>
          <Box mb="$4" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
            <HStack justifyContent="space-between" alignItems="flex-start" mb="$3">
              <HStack flex={1} alignItems="center" space="sm">
                {category && (
                  <Box bg={category.color + '20'} borderRadius="$full" p="$2">
                    <Icon name={category.icon} size={20} color={category.color} />
                  </Box>
                )}
                <VStack flex={1}>
                  <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$1">{budget.name}</Text>
                  <Text fontSize="$sm" color={colors.textSecondary}>
                    {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}
                  </Text>
                </VStack>
              </HStack>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteBudget(budget.id);
                }}
                p="$1"
              >
                <Icon name="delete" size={20} color={colors.error} />
              </Pressable>
            </HStack>

            <HStack alignItems="baseline" mb="$3">
              <Text fontWeight="$bold" fontSize="$xl" color={colors.text}>{formatCurrency(spent)}</Text>
              <Text fontSize="$md" color={colors.textSecondary}> / {formatCurrency(budget.amount)}</Text>
            </HStack>

            <ProgressBar
              progress={percentage / 100}
              color={progressColor}
              style={{ height: 8, borderRadius: 4, marginBottom: 12 }}
            />

            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$sm" fontWeight="$medium" color={progressColor}>
                {percentage.toFixed(1)}% used
              </Text>
              <Text fontSize="$sm" fontWeight="$medium" color={remaining >= 0 ? colors.success : colors.error}>
                {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}
              </Text>
            </HStack>
          </Box>
        </Pressable>
      );
  }, [getBudgetSpent, getBudgetPercentage, getProgressColor, formatCurrency, categories, handleEditBudget, handleDeleteBudget]);

  const renderEmptyState = () => (
    <VStack alignItems="center" justifyContent="center" py="$16" px="$8">
      <Icon name="account-balance-wallet" size={64} color={colors.textMuted} />
      <Text fontWeight="$semibold" fontSize="$xl" color={colors.text} mt="$4" mb="$2">No budgets yet</Text>
      <Text fontSize="$md" color={colors.textSecondary} textAlign="center" mb="$6">
        Create your first budget to start tracking your spending
      </Text>
      <Pressable
        onPress={() => setShowAddModal(true)}
        bg={colors.primary}
        borderRadius="$lg"
        px="$6"
        py="$3"
        flexDirection="row"
        alignItems="center"
      >
        <Icon name="add" size={20} color={colors.white} />
        <Text color={colors.white} fontWeight="$semibold" ml="$2">Create Your First Budget</Text>
      </Pressable>
    </VStack>
  );

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg={colors.backgroundSecondary}>
        <Spinner size="large" color={colors.primary} />
        <Text mt="$3" color={colors.textSecondary}>Loading budgets...</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg={colors.backgroundSecondary} pt="$8">
      {/* Header */}
      <Box px="$5" pt="$10" pb="$4" bg={colors.white} borderBottomWidth={1} borderBottomColor={colors.border}>
        <Heading size="2xl" color={colors.text} mb="$1">Budgets</Heading>
        <Text color={colors.textSecondary} fontSize="$md">Track your spending limits</Text>
      </Box>

      {/* Budgets List */}
      <ScrollView
        flex={1}
        p="$4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {budgets.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Box mb="$4">
              <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$3">Your Budgets</Text>
            </Box>
            {budgets.map(renderBudgetItem)}
          </>
        )}
        
        <Box h={80} />
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        onPress={() => setShowAddModal(true)}
        position="absolute"
        right="$4"
        bottom="$4"
        bg={colors.primary}
        w={56}
        h={56}
        borderRadius="$full"
        alignItems="center"
        justifyContent="center"
        shadowColor={colors.primary}
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.3}
        shadowRadius={8}
        elevation={6}
      >
        <Icon name="add" size={28} color={colors.white} />
      </Pressable>

      {/* Add/Edit Budget Modal */}
      <AddBudgetModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingBudget(null);
        }}
        onSave={handleAddBudget}
        initialData={editingBudget}
        categories={categories}
        onCategoryAdded={(newCategory) => {
          setCategories(prev => [...prev, newCategory]);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={showDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete Budget"
        message="Are you sure you want to delete this budget? This action cannot be undone."
      />
    </Box>
  );
};

export default BudgetsScreen;
