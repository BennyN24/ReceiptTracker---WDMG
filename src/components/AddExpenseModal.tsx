import React, { useState, useEffect } from 'react';
import {
  Modal,
  Image,
  Dimensions,
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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { useThemeColors } from '../hooks/useThemeColors';
import type { ColorPalette } from '../styles/theme';
import type { Category, Frequency } from '../types';

// ─── Props / internal types ───────────────────────────────

interface ExpenseInitialData {
  vendor?: string;
  amount?: number;
  description?: string;
  category?: string;
  date?: string;
  isRecurring?: boolean;
  frequency?: Frequency;
  receiptImage?: string;
}

interface ExpenseFormData {
  vendor: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  isRecurring: boolean;
  frequency: Frequency | null;
}

interface FormErrors {
  vendor?: string;
  amount?: string;
  category?: string;
}

interface AddExpenseModalProps {
  onClose: () => void;
  onSave: (data: ExpenseFormData) => void;
  categories: Category[];
  initialData?: ExpenseInitialData | null;
  receiptImageUri?: string | null;
}

interface FrequencyOption {
  label: string;
  value: Frequency;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ onClose, onSave, categories, initialData, receiptImageUri }) => {
  const colors: ColorPalette = useThemeColors();
  const [showFullImage, setShowFullImage] = useState<boolean>(false);
  const [vendor, setVendor] = useState<string>(initialData?.vendor || '');
  const [amount, setAmount] = useState<string>(
    initialData?.amount ? String(initialData.amount) : ''
  );
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialData?.category || '');
  const [date, setDate] = useState<Date>(
    initialData?.date ? new Date(initialData.date + 'T00:00:00') : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isRecurring, setIsRecurring] = useState<boolean>(initialData?.isRecurring || false);
  const [frequency, setFrequency] = useState<Frequency>(initialData?.frequency || 'monthly');
  const [errors, setErrors] = useState<FormErrors>({});

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
          // Robust date parsing
          let parsedDate: Date | null = null;
          if (/^\d{4}-\d{2}-\d{2}$/.test(initialData.date)) {
            parsedDate = new Date(initialData.date + 'T00:00:00');
          } else {
            const tempDate = new Date(initialData.date);
            if (!isNaN(tempDate.getTime())) {
              parsedDate = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate());
            }
          }
          
          if (parsedDate) {
            setDate(parsedDate);
          }
        } catch (e) {
          console.warn('Invalid date in initialData:', initialData.date);
        }
      }
      if (initialData.isRecurring !== undefined) setIsRecurring(initialData.isRecurring);
      if (initialData.frequency) setFrequency(initialData.frequency);
    }
  }, [initialData]);

  const setToToday = () => {
    const now = new Date();
    setDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    Toast.show({
      type: 'info',
      text1: 'Date Reset',
      text2: 'Set to today',
      position: 'bottom',
    });
  };

  const frequencyOptions: FrequencyOption[] = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Bi-weekly', value: 'biweekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly' },
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    }

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

  const handleSave = (): void => {
    if (!validateForm()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all required fields correctly',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    // Format date using local date parts to avoid UTC timezone shift
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    const expenseData: ExpenseFormData = {
      vendor: vendor.trim(),
      amount: parseFloat(amount),
      description: description.trim(),
      category: selectedCategory,
      date: `${yyyy}-${mm}-${dd}`,
      isRecurring: isRecurring,
      frequency: isRecurring ? frequency : null,
    };

    onSave(expenseData);
    Toast.show({
      type: 'success',
      text1: initialData ? 'Expense Updated' : 'Expense Added',
      text2: `${vendor} - $${parseFloat(amount).toFixed(2)}`,
      position: 'top',
      visibilityTime: 2500,
    });
  };

  const handleDateChange = (selectedDate: Date | undefined): void => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      const normalised = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      setDate(normalised);
    }
    setShowDatePicker(false);
  };

  const formatDate = (d: Date): string => {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Portal>
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
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
                onChangeText={(text: string) => {
                  const numericValue = text.replace(/[^0-9.]/g, '');
                  const parts = numericValue.split('.');
                  if (parts.length > 2) {
                    setAmount(parts[0] + '.' + parts[1]);
                  } else if (parts.length === 2 && parts[1].length > 2) {
                    setAmount(parts[0] + '.' + parts[1].substring(0, 2));
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
            <HStack justifyContent="space-between" alignItems="center" mb="$2">
              <Text fontWeight="$semibold" fontSize="$md" color={colors.text}>Date</Text>
              <Pressable onPress={setToToday}>
                <Text color={colors.primary} fontSize="$sm" fontWeight="$medium">Set to Today</Text>
              </Pressable>
            </HStack>
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
            display="default"
            onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
              if (event.type === 'set' && selectedDate) {
                handleDateChange(selectedDate);
              } else {
                setShowDatePicker(false);
              }
            }}
            maximumDate={new Date()}
          />
        )}
        </Box>
      </Modal>
    </Portal>
  );
};

export default AddExpenseModal;
