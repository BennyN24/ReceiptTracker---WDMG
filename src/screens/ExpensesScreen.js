import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  Platform,
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
  InputIcon,
  InputSlot,
  Badge,
  BadgeText,
  Spinner,
} from '@gluestack-ui/themed';
import Icon from '@expo/vector-icons/MaterialIcons';
import AddExpenseModal from '../components/AddExpenseModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { StorageService } from '../services/StorageService';
import RecurringExpenseService from '../services/RecurringExpenseService';
import NotificationService from '../services/NotificationService';
import CurrencyService from '../services/CurrencyService';
import { useThemeColors } from '../hooks/useThemeColors';

const ExpensesScreen = ({ navigation }) => {
  const colors = useThemeColors();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState({ currency: 'USD' });

  useEffect(() => {
    loadData();
  }, []);

  const filterAndSortExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(expense =>
        expense.vendor.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(expense => expense.category === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date) - new Date(a.date);
        case 'oldest':
          return new Date(a.date) - new Date(b.date);
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

  useEffect(() => {
    setFilteredExpenses(filterAndSortExpenses);
  }, [filterAndSortExpenses]);

  const loadData = async () => {
    try {
      const [expensesData, categoriesData, settingsData] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getCategories(),
        StorageService.getSettings(),
      ]);
      
      setExpenses(expensesData);
      setCategories(categoriesData);
      setSettings(settingsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddExpense = async (expenseData) => {
    try {
      if (expenseData.isRecurring) {
        const recurringData = {
          vendor: expenseData.vendor,
          amount: expenseData.amount,
          category: expenseData.category,
          frequency: expenseData.frequency,
          startDate: expenseData.date,
          endDate: null,
          notes: expenseData.description,
          receiptImage: editingExpense?.receiptImage || null,
        };
        await RecurringExpenseService.createRecurringExpense(recurringData);
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

      // Check budget and send notification if threshold exceeded
      if (!editingExpense && !expenseData.isRecurring && settings.notifications) {
        try {
          const [allExpenses, currentSettings] = await Promise.all([
            StorageService.getExpenses(),
            StorageService.getSettings(),
          ]);
          const now = new Date();
          const monthlyExpenses = allExpenses.filter(e => {
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
              remaining,
              currentSettings.currency || 'USD'
            );
          }
        } catch (notifError) {
          console.error('Budget notification check error:', notifError);
        }
      }
    } catch (error) {
      Alert.alert('Error', expenseData.isRecurring ? 'Failed to create recurring expense' : (editingExpense ? 'Failed to update expense' : 'Failed to add expense'));
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowAddModal(true);
  };

  const handleDeleteExpense = (expenseId) => {
    setDeletingExpenseId(expenseId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await StorageService.deleteExpense(deletingExpenseId);
      await loadData();
      setShowDeleteModal(false);
      setDeletingExpenseId(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete expense');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingExpenseId(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSortBy('newest');
  };

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
      year: 'numeric',
    });
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Other';
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.color : '#6b7280';
  };

  const renderExpenseItem = ({ item }) => (
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
              onPress={(e) => {
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
  );

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
    <Box flex={1} bg={colors.backgroundSecondary}>
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
                onValueChange={(value) => setSortBy(value)}
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
          initialData={editingExpense}
          receiptImageUri={editingExpense?.receiptImage}
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
