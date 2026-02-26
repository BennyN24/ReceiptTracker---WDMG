import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  Box,
  Text,
  HStack,
  VStack,
  Pressable,
  Input,
  InputField,
  InputSlot,
  Spinner,
} from '@gluestack-ui/themed';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import AddExpenseModal from '../components/AddExpenseModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { StorageService } from '../services/StorageService';
import RecurringExpenseService from '../services/RecurringExpenseService';
import NotificationService from '../services/NotificationService';
import CurrencyService from '../services/CurrencyService';
import AdService from '../services/AdService';
import InterstitialAdManager from '../services/InterstitialAdManager';
import BannerAd from '../components/BannerAd';
import { useThemeColors } from '../hooks/useThemeColors';
import type { Expense, Category, AppSettings, RecurringExpense } from '../types';
import type { ColorPalette } from '../styles/theme';

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

interface ExpensesScreenProps {
  navigation: any;
}

const ExpensesScreen: React.FC<ExpensesScreenProps> = ({ navigation }) => {
  const colors: ColorPalette = useThemeColors();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings>({ currency: 'USD' });

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const [expensesData, categoriesData, settingsData] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getAllCategories(),
        StorageService.getSettings(),
      ]);
      
      setExpenses(expensesData);
      setCategories(categoriesData);
      setSettings(settingsData);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load expenses',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filterAndSortExpenses = useMemo((): Expense[] => {
    let filtered = [...expenses];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((expense) =>
        expense.vendor.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((expense) => expense.category === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'highest':
          return b.amount - a.amount;
        case 'lowest':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [expenses, searchQuery, selectedCategory, sortBy]);

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setShowAddModal(true);
  }, []);

  const handleDeleteExpense = useCallback((expenseId: string) => {
    setDeletingExpenseId(expenseId);
    setShowDeleteModal(true);
  }, []);

  const handleAddExpense = async (expenseData: any): Promise<void> => {
    try {
      if (expenseData.isRecurring) {
        const recurringData: Partial<RecurringExpense> = {
          vendor: expenseData.vendor,
          amount: expenseData.amount,
          category: expenseData.category,
          frequency: expenseData.frequency,
          startDate: expenseData.date,
          notes: expenseData.description,
        };
        await RecurringExpenseService.createRecurringExpense(recurringData as Omit<RecurringExpense, 'id' | 'nextDueDate'>);
      } else {
        if (editingExpense) {
          await StorageService.updateExpense(editingExpense.id, expenseData);
        } else {
          await StorageService.addExpense(expenseData);
        }
      }
      await loadData();
      setShowAddModal(false);
      setEditingExpense(null);

      // Show ad after expense creation (wrapped to prevent ad errors from affecting core flow)
      if (!editingExpense) {
        try {
          await InterstitialAdManager.showAfterExpenseCreation();
        } catch (adError) {
          console.error('Ad display error (non-critical):', adError);
        }
      }

      // Check budget and send notification if threshold exceeded
      if (!editingExpense && !expenseData.isRecurring && settings.notifications) {
        try {
          const [allExpenses, currentSettings] = await Promise.all([
            StorageService.getExpenses(),
            StorageService.getSettings(),
          ]);
          const now = new Date();
          const monthlyExpenses = allExpenses.filter((e) => {
            const d = new Date(e.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
          const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
          const budget = currentSettings.monthlyBudget || 1550;
          const percentage = (totalSpent / budget) * 100;
          const remaining = budget - totalSpent;
          const currencySymbol = CurrencyService.getSymbol(currentSettings.currency || 'USD');

          if (percentage >= 75) {
            await NotificationService.sendBudgetAlert(
              `Monthly Budget (${currencySymbol}${budget.toFixed(2)})`,
              percentage,
              remaining
            );
          }
        } catch (notifError) {
          console.error('Budget notification check error:', notifError);
        }
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: expenseData.isRecurring ? 'Failed to create recurring expense' : (editingExpense ? 'Failed to update expense' : 'Failed to add expense'),
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };


  const handleConfirmDelete = async (): Promise<void> => {
    if (!deletingExpenseId) return;
    try {
      await StorageService.deleteExpense(deletingExpenseId);
      await loadData();
      setShowDeleteModal(false);
      setDeletingExpenseId(null);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete expense',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const handleCancelDelete = (): void => {
    setShowDeleteModal(false);
    setDeletingExpenseId(null);
  };

  const clearFilters = useCallback((): void => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSortBy('newest');
  }, []);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency || 'USD',
    }).format(amount);
  }, [settings.currency]);

  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const getCategoryName = useCallback((categoryId: string): string => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : 'Other';
  }, [categories]);

  const getCategoryColor = useCallback((categoryId: string): string => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.color : '#6b7280';
  }, [categories]);

  const renderExpenseItem = useCallback(({ item }: ListRenderItemInfo<Expense>) => (
    <Pressable onPress={() => handleEditExpense(item)}>
      <Box mb="$3" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <HStack justifyContent="space-between" alignItems="flex-start">
          <VStack flex={1}>
            <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$1">{item.vendor}</Text>
            <Text fontSize="$sm" color={colors.textSecondary}>{formatDate(item.date)}</Text>
            {item.description ? (
              <Text fontSize="$xs" color={colors.textSecondary} mt="$1" numberOfLines={2}>{item.description}</Text>
            ) : null}
          </VStack>
          <VStack alignItems="flex-end">
            <Text fontWeight="$bold" fontSize="$md" color={colors.error} mb="$1">{formatCurrency(item.amount)}</Text>
            <Pressable
              onPress={(e: any) => {
                e.stopPropagation();
                handleDeleteExpense(item.id);
              }}
              p="$1"
            >
              <Icon name="delete" size={20} color={colors.error} />
            </Pressable>
          </VStack>
        </HStack>
        <Box mt="$3">
          <Box alignSelf="flex-start" bg={getCategoryColor(item.category)} borderRadius="$full" px="$3" py="$1">
            <Text color={colors.white} fontSize="$xs" fontWeight="$medium">{getCategoryName(item.category)}</Text>
          </Box>
        </Box>
      </Box>
    </Pressable>
  ), [colors, formatCurrency, formatDate, getCategoryName, getCategoryColor, handleEditExpense, handleDeleteExpense]);

  const renderEmptyState = () => (
    <VStack alignItems="center" justifyContent="center" py="$16" px="$8">
      <Icon name="receipt" size={64} color={colors.textMuted} />
      <Text fontWeight="$semibold" fontSize="$xl" color={colors.text} mt="$4" mb="$2">No expenses found</Text>
      <Text fontSize="$md" color={colors.textSecondary} textAlign="center" mb="$6">
        {searchQuery || selectedCategory
          ? 'Try adjusting your filters'
          : 'Start tracking your expenses by adding your first one'}
      </Text>
      {!searchQuery && !selectedCategory && (
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
          <Text color={colors.white} fontWeight="$semibold" ml="$2">Add Your First Expense</Text>
        </Pressable>
      )}
    </VStack>
  );

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg={colors.backgroundSecondary}>
        <Spinner size="large" color={colors.primary} />
        <Text mt="$3" color={colors.textSecondary}>Loading expenses...</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg={colors.backgroundSecondary} pt="$8">
      {/* Header with Search and Recurring Button */}
      <Box bg={colors.white} borderBottomWidth={1} borderBottomColor={colors.border}>
        <HStack p="$4" alignItems="center" justifyContent="space-between" mb="$2">
          <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} flex={1}>Expenses</Text>
          <Pressable
            onPress={() => navigation.navigate('RecurringExpenses')}
            bg={colors.primary}
            borderRadius="$lg"
            px="$3"
            py="$2"
            flexDirection="row"
            alignItems="center"
          >
            <Icon name="repeat" size={18} color={colors.white} />
            <Text color={colors.white} fontWeight="$medium" fontSize="$sm" ml="$1">Recurring</Text>
          </Pressable>
        </HStack>
        <Box px="$4" pb="$4">
          <Input borderRadius="$lg" bg="$coolGray100" borderColor="$coolGray200">
            <InputSlot pl="$3">
              <Icon name="search" size={20} color={colors.textSecondary} />
            </InputSlot>
            <InputField
              placeholder="Search vendor..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              fontSize="$md"
            />
          </Input>
        </Box>
      </Box>

      {/* Filter Options */}
      <Box bg={colors.white} px="$4" py="$4" borderBottomWidth={1} borderBottomColor={colors.border}>
        <HStack space="md" alignItems="center" mb="$3">
          <VStack flex={1}>
            <Text fontSize="$xs" fontWeight="$medium" color={colors.textSecondary} mb="$1">Sort By</Text>
            <Box borderWidth={1} borderColor={colors.border} borderRadius="$lg" bg={colors.white} overflow="hidden">
              <Picker
                selectedValue={sortBy}
                onValueChange={(value) => setSortBy(value as SortOption)}
                style={{ height: 50 }}
              >
                <Picker.Item label="Newest First" value="newest" />
                <Picker.Item label="Oldest First" value="oldest" />
                <Picker.Item label="Highest Amount" value="highest" />
                <Picker.Item label="Lowest Amount" value="lowest" />
              </Picker>
            </Box>
          </VStack>

          <VStack flex={1}>
            <Text fontSize="$xs" fontWeight="$medium" color={colors.textSecondary} mb="$1">Category</Text>
            <Box borderWidth={1} borderColor={colors.border} borderRadius="$lg" bg={colors.white} overflow="hidden">
              <Picker
                selectedValue={selectedCategory || 'all'}
                onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}
                style={{ height: 50 }}
              >
                <Picker.Item label="All Categories" value="all" />
                {categories.map((category) => (
                  <Picker.Item key={category.id} label={category.name} value={category.id} />
                ))}
              </Picker>
            </Box>
          </VStack>
        </HStack>

        {(searchQuery || selectedCategory || sortBy !== 'newest') && (
          <Pressable onPress={clearFilters} alignSelf="flex-start">
            <Text color={colors.primary} fontSize="$sm" fontWeight="$medium">Clear Filters</Text>
          </Pressable>
        )}
      </Box>

      <BannerAd adUnitId={AdService.getAdUnitIds().banner.expenses} />

      {/* Expenses List */}
      <FlatList
        data={filterAndSortExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      />

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
        // @ts-ignore - position absolute and shadow props
        shadowColor={colors.primary}
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.3}
        shadowRadius={8}
        elevation={6}
      >
        <Icon name="add" size={28} color={colors.white} />
      </Pressable>

      {/* Add/Edit Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          onClose={() => {
            setShowAddModal(false);
            setEditingExpense(null);
          }}
          onSave={handleAddExpense}
          categories={categories}
          initialData={editingExpense || undefined}
          receiptImageUri={editingExpense?.receiptImage || undefined}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={showDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
      />
    </Box>
  );
};

export default ExpensesScreen;
