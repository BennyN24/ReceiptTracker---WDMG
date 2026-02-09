import React, { useState, useEffect, useContext } from 'react';
import {
  Alert,
  Modal,
  Image,
  Dimensions,
  StatusBar,
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from '../hooks/useThemeColors';

const AddExpenseModal = ({ onClose, onSave, categories, initialData, receiptImageUri }) => {
  const colors = useThemeColors();
  const [showFullImage, setShowFullImage] = useState(false);
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
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [frequency, setFrequency] = useState(initialData?.frequency || 'monthly');
  const [errors, setErrors] = useState({});

  // Sync form fields when initialData changes (e.g., when OCR/Gemini data arrives)
  useEffect(() => {
    if (initialData) {
      console.log('Syncing initialData to form fields:', initialData);
      if (initialData.vendor) setVendor(initialData.vendor);
      if (initialData.amount) setAmount(String(initialData.amount));
      if (initialData.description) setDescription(initialData.description);
      if (initialData.category) setSelectedCategory(initialData.category);
      if (initialData.date) {
        try {
          setDate(new Date(initialData.date + 'T00:00:00'));
        } catch (e) {
          console.warn('Invalid date in initialData:', initialData.date);
        }
      }
      if (initialData.isRecurring !== undefined) setIsRecurring(initialData.isRecurring);
      if (initialData.frequency) setFrequency(initialData.frequency);
    }
  }, [initialData]);

  const frequencyOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Bi-weekly', value: 'biweekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly' },
  ];

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
      isRecurring: isRecurring,
      frequency: isRecurring ? frequency : null,
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
          {/* Receipt Image Preview */}
          {(receiptImageUri || initialData?.receiptImage) && (
            <VStack mb="$6">
              <HStack alignItems="center" justifyContent="space-between" mb="$2">
                <Text fontWeight="$semibold" fontSize="$md" color={colors.text}>Receipt Image</Text>
                <HStack alignItems="center">
                  <Icon name="fullscreen" size={18} color={colors.textSecondary} />
                  <Text fontSize="$xs" color={colors.textSecondary} ml="$1">Tap to zoom</Text>
                </HStack>
              </HStack>
              <Pressable onPress={() => setShowFullImage(true)}>
                <Box
                  borderRadius="$lg"
                  borderWidth={1}
                  borderColor={colors.border}
                  overflow="hidden"
                  bg={colors.backgroundSecondary}
                >
                  <Image
                    source={{ uri: receiptImageUri || initialData?.receiptImage }}
                    style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                  />
                </Box>
              </Pressable>
            </VStack>
          )}

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

          {/* Recurring Expense Toggle */}
          <VStack mb="$6">
            <HStack alignItems="center" justifyContent="space-between">
              <Text fontWeight="$semibold" fontSize="$md" color={colors.text}>Make this recurring?</Text>
              <Pressable
                onPress={() => setIsRecurring(!isRecurring)}
                bg={isRecurring ? colors.primary : colors.borderLight}
                borderRadius="$full"
                w={50}
                h={28}
                justifyContent="center"
                alignItems={isRecurring ? 'flex-end' : 'flex-start'}
                px="$1"
              >
                <Box
                  w={24}
                  h={24}
                  borderRadius="$full"
                  bg={colors.white}
                />
              </Pressable>
            </HStack>
          </VStack>

          {/* Frequency Selection (only show if recurring) */}
          {isRecurring && (
            <VStack mb="$6">
              <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Frequency</Text>
              <HStack flexWrap="wrap" space="sm">
                {frequencyOptions.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setFrequency(opt.value)}
                    bg={frequency === opt.value ? colors.primary : colors.borderLight}
                    borderRadius="$lg"
                    px="$3.5"
                    py="$2"
                    mb="$2"
                  >
                    <Text
                      fontSize="$sm"
                      fontWeight="$medium"
                      color={frequency === opt.value ? colors.white : colors.textSecondary}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            </VStack>
          )}

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

        {/* Full-Screen Image Viewer Modal */}
        <Modal
          visible={showFullImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFullImage(false)}
          statusBarTranslucent
        >
          <Box flex={1} bg="rgba(0, 0, 0, 0.95)">
            <HStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              zIndex={10}
              justifyContent="space-between"
              alignItems="center"
              px="$4"
              pt="$12"
              pb="$3"
            >
              <Pressable onPress={() => setShowFullImage(false)} p="$2">
                <Icon name="close" size={28} color="#FFFFFF" />
              </Pressable>
              <Text fontWeight="$semibold" fontSize="$md" color="#FFFFFF">Receipt Image</Text>
              <Box w={44} />
            </HStack>
            <ScrollView
              flex={1}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              maximumZoomScale={5}
              minimumZoomScale={1}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              bouncesZoom={true}
            >
              <Image
                source={{ uri: receiptImageUri || initialData?.receiptImage }}
                style={{
                  width: Dimensions.get('window').width,
                  height: Dimensions.get('window').height * 0.85,
                  resizeMode: 'contain',
                }}
              />
            </ScrollView>
          </Box>
        </Modal>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={(event, selectedDate) => {
              if (event.type === 'set' && selectedDate) {
                handleDateChange(selectedDate);
              } else if (event.type === 'dismissed') {
                setShowDatePicker(false);
              }
            }}
            maximumDate={new Date()}
          />
        )}
      </Box>
    </Portal>
  );
};

export default AddExpenseModal;
