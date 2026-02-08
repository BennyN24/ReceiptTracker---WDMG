import React, { useState } from 'react';
import {
  Alert,
  Modal,
} from 'react-native';
import {
  Portal,
} from 'react-native-paper';
import {
  Box,
  Text,
  VStack,
  HStack,
  Pressable,
  ScrollView,
  Input,
  InputField,
} from '@gluestack-ui/themed';
import Icon from '@expo/vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';
import { colors } from '../styles/theme';

const AddExpenseModal = ({ onClose, onSave, categories, initialData }) => {
  const [vendor, setVendor] = useState(initialData?.vendor || '');
  const [amount, setAmount] = useState(
    initialData?.amount ? String(initialData.amount) : ''
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedCategory, setSelectedCategory] = useState(initialData?.category || '');
  const [date, setDate] = useState(
    initialData?.date ? new Date(initialData.date + 'T00:00:00') : new Date()
  );
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
      description: description.trim(),
      category: selectedCategory,
      date: date.toISOString().split('T')[0],
    };

    onSave(expenseData);
  };

  const handleDateChange = (selectedDate) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
    setShowDatePicker(false);
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
      <Box flex={1} bg={colors.white}>
        <HStack bg={colors.white} borderBottomWidth={1} borderBottomColor={colors.border} py="$3" px="$2" alignItems="center" justifyContent="space-between" pt="$12">
          <Pressable onPress={onClose} p="$2">
            <Icon name="close" size={24} color={colors.text} />
          </Pressable>
          <Text fontWeight="$semibold" fontSize="$lg" color={colors.text}>{initialData ? 'Edit Expense' : 'Add Expense'}</Text>
          <Pressable onPress={handleSave} p="$2">
            <Icon name="check" size={24} color={colors.primary} />
          </Pressable>
        </HStack>

        <ScrollView flex={1} p="$4" showsVerticalScrollIndicator={false}>
          {/* Vendor Input */}
          <VStack mb="$6">
            <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Vendor</Text>
            <Input
              borderRadius="$lg"
              borderColor={errors.vendor ? colors.error : colors.border}
              borderWidth={errors.vendor ? 2 : 1}
            >
              <InputField
                placeholder="e.g. Starbucks"
                value={vendor}
                onChangeText={setVendor}
                fontSize="$md"
              />
            </Input>
            {errors.vendor && (
              <Text fontSize="$xs" color={colors.error} mt="$1">{errors.vendor}</Text>
            )}
          </VStack>

          {/* Description Input */}
          <VStack mb="$6">
            <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Description</Text>
            <Input borderRadius="$lg" borderColor={colors.border} h={100}>
              <InputField
                placeholder="Items or notes"
                value={description}
                onChangeText={setDescription}
                fontSize="$md"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </Input>
          </VStack>

          {/* Amount Input */}
          <VStack mb="$6">
            <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Amount ($)</Text>
            <Input
              borderRadius="$lg"
              borderColor={errors.amount ? colors.error : colors.border}
              borderWidth={errors.amount ? 2 : 1}
            >
              <InputField
                placeholder="0.00"
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
                keyboardType="numeric"
                fontSize="$md"
              />
            </Input>
            {errors.amount && (
              <Text fontSize="$xs" color={colors.error} mt="$1">{errors.amount}</Text>
            )}
          </VStack>

          {/* Category Selection */}
          <VStack mb="$6">
            <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Category</Text>
            <HStack flexWrap="wrap" space="sm">
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  bg={selectedCategory === category.id ? category.color : colors.borderLight}
                  borderRadius="$full"
                  px="$3.5"
                  py="$2"
                  mb="$2"
                >
                  <Text
                    fontSize="$sm"
                    fontWeight="$medium"
                    color={selectedCategory === category.id ? colors.white : colors.textSecondary}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </HStack>
            {errors.category && (
              <Text fontSize="$xs" color={colors.error} mt="$1">{errors.category}</Text>
            )}
          </VStack>

          {/* Date Selection */}
          <VStack mb="$6">
            <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Date</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              borderWidth={1}
              borderColor={colors.border}
              borderRadius="$lg"
              p="$4"
              bg={colors.white}
            >
              <HStack alignItems="center" justifyContent="space-between">
                <Icon name="calendar-today" size={20} color={colors.textSecondary} />
                <Text fontSize="$md" color={colors.text} flex={1} textAlign="center">{formatDate(date)}</Text>
                <Icon name="chevron-right" size={20} color={colors.textSecondary} />
              </HStack>
            </Pressable>
          </VStack>

          {/* Action Buttons */}
          <VStack mt="$8" space="md">
            <Pressable
              onPress={handleSave}
              bg={colors.primary}
              borderRadius="$lg"
              py="$4"
              alignItems="center"
            >
              <Text color={colors.white} fontWeight="$semibold" fontSize="$md">Save Expense</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              borderRadius="$lg"
              py="$4"
              alignItems="center"
            >
              <Text color={colors.textSecondary} fontWeight="$medium" fontSize="$md">Cancel</Text>
            </Pressable>
          </VStack>
        </ScrollView>

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Box flex={1} bg="rgba(0, 0, 0, 0.5)" justifyContent="flex-end">
            <Box bg={colors.white} borderTopLeftRadius="$2xl" borderTopRightRadius="$2xl" p="$4">
              <HStack justifyContent="space-between" alignItems="center" mb="$4">
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text color={colors.textSecondary} fontWeight="$medium">Cancel</Text>
                </Pressable>
                <Text fontWeight="$semibold" fontSize="$lg" color={colors.text}>Select Date</Text>
                <Pressable onPress={() => handleDateChange(date)}>
                  <Text color={colors.primary} fontWeight="$semibold">Done</Text>
                </Pressable>
              </HStack>
              <Box alignItems="center" py="$4">
                <DatePicker
                  date={date}
                  onDateChange={setDate}
                  mode="date"
                  maximumDate={new Date()}
                />
              </Box>
            </Box>
          </Box>
        </Modal>
      </Box>
    </Portal>
  );
};

export default AddExpenseModal;
