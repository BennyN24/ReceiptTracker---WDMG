import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import {
  Button,
  Card,
  Text,
  FAB,
  Dialog,
  Portal,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import RecurringExpenseService from '../services/RecurringExpenseService';
import StorageService from '../services/StorageService';

const RecurringExpensesScreen = () => {
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    vendor: '',
    amount: '',
    category: 'Food & Dining',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start');

  const categories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Other',
  ];

  const frequencyOptions = RecurringExpenseService.getFrequencyOptions();

  useEffect(() => {
    loadRecurringExpenses();
  }, []);

  const loadRecurringExpenses = async () => {
    try {
      setLoading(true);
      const expenses = await RecurringExpenseService.getRecurringExpenses();
      setRecurringExpenses(expenses);
    } catch (error) {
      console.error('Load recurring expenses error:', error);
      Alert.alert('Error', 'Failed to load recurring expenses');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecurringExpenses();
    setRefreshing(false);
  };

  const handleAddExpense = async () => {
    try {
      if (!formData.vendor.trim() || !formData.amount) {
        Alert.alert('Validation Error', 'Please fill in all required fields');
        return;
      }

      const expenseData = {
        vendor: formData.vendor.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        frequency: formData.frequency,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        notes: formData.notes.trim(),
      };

      if (editingId) {
        await RecurringExpenseService.updateRecurringExpense(editingId, expenseData);
      } else {
        await RecurringExpenseService.createRecurringExpense(expenseData);
      }

      await loadRecurringExpenses();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Add/update expense error:', error);
      Alert.alert('Error', 'Failed to save recurring expense');
    }
  };

  const handleDeleteExpense = (id) => {
    Alert.alert(
      'Delete Recurring Expense',
      'Are you sure you want to delete this recurring expense?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await RecurringExpenseService.deleteRecurringExpense(id);
              await loadRecurringExpenses();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete recurring expense');
            }
          },
        },
      ]
    );
  };

  const handleEditExpense = (expense) => {
    setFormData({
      vendor: expense.vendor,
      amount: expense.amount.toString(),
      category: expense.category,
      frequency: expense.frequency,
      startDate: expense.startDate,
      endDate: expense.endDate || '',
      notes: expense.notes || '',
    });
    setEditingId(expense.id);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      vendor: '',
      amount: '',
      category: 'Food & Dining',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      notes: '',
    });
    setEditingId(null);
  };

  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      if (datePickerMode === 'start') {
        setFormData({ ...formData, startDate: dateStr });
      } else {
        setFormData({ ...formData, endDate: dateStr });
      }
    }
    setShowDatePicker(false);
  };

  const renderExpenseItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text variant="titleMedium" style={styles.vendor}>
              {item.vendor}
            </Text>
            <Text variant="bodySmall" style={styles.frequency}>
              {RecurringExpenseService.getFrequencyLabel(item.frequency)}
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.amount}>
            ${item.amount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.cardDetails}>
          <Text variant="bodySmall" style={styles.category}>
            {item.category}
          </Text>
          <Text variant="bodySmall" style={styles.date}>
            Next: {item.nextDueDate.split('T')[0]}
          </Text>
        </View>

        {item.notes && (
          <Text variant="bodySmall" style={styles.notes}>
            {item.notes}
          </Text>
        )}

        <View style={styles.cardActions}>
          <Button
            mode="outlined"
            size="small"
            onPress={() => handleEditExpense(item)}
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            size="small"
            textColor="#ef4444"
            onPress={() => handleDeleteExpense(item.id)}
          >
            Delete
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} tintColor="#6366f1" />
        }
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <Text>Loading recurring expenses...</Text>
          </View>
        ) : recurringExpenses.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No recurring expenses yet
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              Create one to automate your regular expenses
            </Text>
          </View>
        ) : (
          <FlatList
            data={recurringExpenses}
            renderItem={renderExpenseItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ScrollView>

      <FAB
        icon="plus"
        onPress={() => {
          resetForm();
          setShowModal(true);
        }}
        style={styles.fab}
      />

      <Modal visible={showModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Button onPress={() => setShowModal(false)}>Cancel</Button>
            <Text variant="titleMedium">
              {editingId ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
            </Text>
            <Button onPress={handleAddExpense}>Save</Button>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              label="Vendor"
              value={formData.vendor}
              onChangeText={text => setFormData({ ...formData, vendor: text })}
              style={styles.input}
            />

            <TextInput
              label="Amount"
              value={formData.amount}
              onChangeText={text => setFormData({ ...formData, amount: text })}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Text variant="labelMedium" style={styles.label}>
              Category
            </Text>
            <SegmentedButtons
              value={formData.category}
              onValueChange={value => setFormData({ ...formData, category: value })}
              buttons={categories.map(cat => ({ value: cat, label: cat }))}
              style={styles.segmentedButtons}
            />

            <Text variant="labelMedium" style={styles.label}>
              Frequency
            </Text>
            <SegmentedButtons
              value={formData.frequency}
              onValueChange={value => setFormData({ ...formData, frequency: value })}
              buttons={frequencyOptions.map(opt => ({
                value: opt.value,
                label: opt.label,
              }))}
              style={styles.segmentedButtons}
            />

            <View style={styles.dateSection}>
              <Text variant="labelMedium" style={styles.label}>
                Start Date
              </Text>
              <Button
                mode="outlined"
                onPress={() => {
                  setDatePickerMode('start');
                  setShowDatePicker(true);
                }}
              >
                {formData.startDate}
              </Button>
            </View>

            <View style={styles.dateSection}>
              <Text variant="labelMedium" style={styles.label}>
                End Date (Optional)
              </Text>
              <Button
                mode="outlined"
                onPress={() => {
                  setDatePickerMode('end');
                  setShowDatePicker(true);
                }}
              >
                {formData.endDate || 'No end date'}
              </Button>
            </View>

            <TextInput
              label="Notes (Optional)"
              value={formData.notes}
              onChangeText={text => setFormData({ ...formData, notes: text })}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </ScrollView>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(datePickerMode === 'start' ? formData.startDate : formData.endDate || new Date())}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 16,
    color: '#1e293b',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#64748b',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
  },
  vendor: {
    fontWeight: '600',
    color: '#1e293b',
  },
  frequency: {
    marginTop: 4,
    color: '#64748b',
  },
  amount: {
    color: '#10b981',
    fontWeight: '700',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  category: {
    color: '#64748b',
  },
  date: {
    color: '#64748b',
  },
  notes: {
    marginVertical: 8,
    color: '#64748b',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    marginTop: 12,
    marginBottom: 8,
    color: '#1e293b',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  dateSection: {
    marginBottom: 16,
  },
});

export default RecurringExpensesScreen;
