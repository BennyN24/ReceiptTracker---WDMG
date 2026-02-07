import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Modal,
  Portal,
  Button,
  TextInput,
  Chip,
  Divider,
  Appbar,
} from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddExpenseModal = ({ onClose, onSave, categories }) => {
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    }

    // Validate amount is a valid positive number
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!selectedCategory) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const expenseData = {
      vendor: vendor.trim(),
      amount: parseFloat(amount),
      category: selectedCategory,
      date: date.toISOString().split('T')[0],
    };

    onSave(expenseData);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Portal>
      <View style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.Action icon="close" onPress={onClose} />
          <Appbar.Content title="Add Expense" />
          <Appbar.Action icon="check" onPress={handleSave} />
        </Appbar.Header>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Vendor Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vendor</Text>
            <TextInput
              label="e.g. Starbucks"
              value={vendor}
              onChangeText={setVendor}
              mode="outlined"
              style={styles.input}
              error={!!errors.vendor}
            />
            {errors.vendor && (
              <Text style={styles.errorText}>{errors.vendor}</Text>
            )}
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount ($)</Text>
            <TextInput
              label="0.00"
              value={amount}
              onChangeText={(text) => {
                // Only allow numeric input with decimal point
                const numericValue = text.replace(/[^0-9.]/g, '');
                // Ensure only one decimal point
                const parts = numericValue.split('.');
                if (parts.length > 2) {
                  setAmount(parts[0] + '.' + parts[1]);
                } else {
                  setAmount(numericValue);
                }
              }}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              error={!!errors.amount}
            />
            {errors.amount && (
              <Text style={styles.errorText}>{errors.amount}</Text>
            )}
          </View>

          {/* Category Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  selected={selectedCategory === category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && {
                      backgroundColor: category.color,
                    },
                  ]}
                  textStyle={[
                    styles.categoryText,
                    selectedCategory === category.id && {
                      color: '#ffffff',
                    },
                  ]}
                >
                  {category.name}
                </Chip>
              ))}
            </View>
            {errors.category && (
              <Text style={styles.errorText}>{errors.category}</Text>
            )}
          </View>

          {/* Date Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dateContent}>
                <Icon name="calendar-today" size={20} color="#64748b" />
                <Text style={styles.dateText}>{formatDate(date)}</Text>
                <Icon name="chevron-right" size={20} color="#64748b" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.saveButton}
              contentStyle={styles.buttonContent}
            >
              Save Expense
            </Button>
            <Button
              mode="text"
              onPress={onClose}
              style={styles.cancelButton}
              contentStyle={styles.buttonContent}
            >
              Cancel
            </Button>
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  content: {
    flex: 1,
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
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#f1f5f9',
  },
  categoryText: {
    color: '#64748b',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 32,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#6366f1',
  },
  cancelButton: {
    borderColor: '#e2e8f0',
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default AddExpenseModal;
