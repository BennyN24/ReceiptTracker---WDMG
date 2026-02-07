import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import {
  Card,
  Button,
  Searchbar,
  Chip,
  FAB,
  Portal,
  Divider,
} from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialIcons';
import AddExpenseModal from '../components/AddExpenseModal';
import { StorageService } from '../services/StorageService';

const ExpensesScreen = ({ navigation }) => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

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
      const [expensesData, categoriesData] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getCategories(),
      ]);
      
      setExpenses(expensesData);
      setCategories(categoriesData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };


  const handleAddExpense = async (expenseData) => {
    try {
      await StorageService.addExpense(expenseData);
      await loadData();
      setShowAddModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
    }
  };

  const handleDeleteExpense = (expenseId) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteExpense(expenseId);
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSortBy('newest');
  };

  const formatCurrency = (amount, currency = settings.currency || 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
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
    <Card style={styles.expenseCard}>
      <Card.Content>
        <View style={styles.expenseHeader}>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseVendor}>{item.vendor}</Text>
            <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.expenseAmountContainer}>
            <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
            <TouchableOpacity
              onPress={() => handleDeleteExpense(item.id)}
              style={styles.deleteButton}
            >
              <Icon name="delete" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.categoryContainer}>
          <Chip
            style={[styles.categoryChip, { backgroundColor: getCategoryColor(item.category) }]}
            textStyle={styles.categoryText}
          >
            {getCategoryName(item.category)}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="receipt" size={64} color="#94a3b8" />
      <Text style={styles.emptyTitle}>No expenses found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedCategory
          ? 'Try adjusting your filters'
          : 'Start tracking your expenses by adding your first one'}
      </Text>
      {!searchQuery && !selectedCategory && (
        <Button
          mode="contained"
          onPress={() => setShowAddModal(true)}
          style={styles.addButton}
          icon="plus"
        >
          Add Your First Expense
        </Button>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading expenses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search vendor..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Filter Options */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Sort:</Text>
          <Chip
            selected={sortBy === 'newest'}
            onPress={() => setSortBy('newest')}
            style={styles.filterChip}
          >
            Newest First
          </Chip>
          <Chip
            selected={sortBy === 'oldest'}
            onPress={() => setSortBy('oldest')}
            style={styles.filterChip}
          >
            Oldest First
          </Chip>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Category:</Text>
          <Chip
            selected={!selectedCategory}
            onPress={() => setSelectedCategory(null)}
            style={styles.filterChip}
          >
            All
          </Chip>
          {categories.slice(0, 3).map((category) => (
            <Chip
              key={category.id}
              selected={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={styles.filterChip}
            >
              {category.name}
            </Chip>
          ))}
        </View>

        {(searchQuery || selectedCategory || sortBy !== 'newest') && (
          <Button
            mode="text"
            onPress={clearFilters}
            style={styles.clearFiltersButton}
            textColor="#6366f1"
          >
            Clear Filters
          </Button>
        )}
      </View>

      {/* Expenses List */}
      <FlatList
        data={filterAndSortExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      />

      {/* Add Expense Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddModal(false)}
        >
          <AddExpenseModal
            onClose={() => setShowAddModal(false)}
            onSave={handleAddExpense}
            categories={categories}
          />
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f1f5f9',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginRight: 12,
    minWidth: 40,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
  },
  listContainer: {
    padding: 16,
  },
  expenseCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseVendor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 14,
    color: '#64748b',
  },
  expenseAmountContainer: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  deleteButton: {
    padding: 4,
  },
  categoryContainer: {
    marginTop: 12,
  },
  categoryChip: {
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 12,
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6366f1',
  },
});

export default ExpensesScreen;
