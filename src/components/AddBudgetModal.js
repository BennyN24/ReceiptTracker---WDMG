import React, { useState, useEffect } from 'react';
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
import { useThemeColors } from '../hooks/useThemeColors';
import { StorageService } from '../services/StorageService';

const ICON_OPTIONS = [
  'label', 'local-offer', 'pets', 'fitness-center', 'home',
  'flight', 'beach-access', 'child-care', 'build', 'brush',
  'cake', 'local-grocery-store', 'local-cafe', 'music-note', 'sports-esports',
  'checkroom', 'devices', 'volunteer-activism', 'savings', 'work',
];

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#d946ef', '#14b8a6', '#0ea5e9', '#a855f7', '#f43f5e',
];

const AddBudgetModal = ({ onClose, onSave, visible, initialData, categories = [], onCategoryAdded }) => {
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [errors, setErrors] = useState({});
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('label');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAmount(String(initialData.amount));
      setPeriod(initialData.period);
      setSelectedCategoryId(initialData.categoryId || '');
    } else {
      setName('');
      setAmount('');
      setPeriod('monthly');
      setSelectedCategoryId('');
    }
    setShowCustomForm(false);
    setCustomName('');
    setCustomIcon('label');
    setCustomColor('#6366f1');
  }, [initialData, visible]);

  const handleCreateCustomCategory = async () => {
    if (!customName.trim()) {
      setErrors(prev => ({ ...prev, customName: 'Category name is required' }));
      return;
    }

    setSavingCategory(true);
    try {
      const newCategory = await StorageService.addCategory({
        name: customName.trim(),
        icon: customIcon,
        color: customColor,
      });

      setSelectedCategoryId(newCategory.id);
      setName(newCategory.name);
      setShowCustomForm(false);
      setCustomName('');
      setErrors(prev => { const { customName, ...rest } = prev; return rest; });

      if (onCategoryAdded) {
        onCategoryAdded(newCategory);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create category');
    } finally {
      setSavingCategory(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedCategoryId) {
      newErrors.category = 'Category is required';
    }

    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const budgetData = {
      name: selectedCategory ? selectedCategory.name : name.trim(),
      amount: parseFloat(amount),
      period,
      categoryId: selectedCategoryId,
    };

    onSave(budgetData);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <Box flex={1} bg={colors.white}>
          <HStack bg={colors.white} borderBottomWidth={1} borderBottomColor={colors.border} py="$3" px="$2" alignItems="center" justifyContent="space-between" pt="$12">
            <Pressable onPress={onClose} p="$2">
              <Icon name="close" size={24} color={colors.text} />
            </Pressable>
            <Text fontWeight="$semibold" fontSize="$lg" color={colors.text}>{initialData ? 'Edit Budget' : 'Create Budget'}</Text>
            <Pressable onPress={handleSave} p="$2">
              <Icon name="check" size={24} color={colors.primary} />
            </Pressable>
          </HStack>

          <ScrollView p="$4">
            <VStack mb="$6">
              <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Category</Text>
              <HStack flexWrap="wrap" space="sm">
                {categories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => {
                      setSelectedCategoryId(category.id);
                      setName(category.name);
                      setShowCustomForm(false);
                    }}
                    bg={selectedCategoryId === category.id ? category.color : colors.borderLight}
                    borderRadius="$full"
                    px="$3.5"
                    py="$2"
                    mb="$2"
                  >
                    <Text
                      fontSize="$sm"
                      fontWeight="$medium"
                      color={selectedCategoryId === category.id ? colors.white : colors.textSecondary}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setShowCustomForm(!showCustomForm)}
                  bg={showCustomForm ? colors.primary : colors.borderLight}
                  borderRadius="$full"
                  px="$3.5"
                  py="$2"
                  mb="$2"
                  borderWidth={1}
                  borderColor={showCustomForm ? colors.primary : colors.border}
                  borderStyle="dashed"
                >
                  <HStack alignItems="center" space="xs">
                    <Icon name="add" size={16} color={showCustomForm ? colors.white : colors.textSecondary} />
                    <Text
                      fontSize="$sm"
                      fontWeight="$medium"
                      color={showCustomForm ? colors.white : colors.textSecondary}
                    >
                      Custom
                    </Text>
                  </HStack>
                </Pressable>
              </HStack>
              {errors.category && (
                <Text fontSize="$xs" color={colors.error} mt="$1">{errors.category}</Text>
              )}
            </VStack>

            {showCustomForm && (
              <Box mb="$6" p="$4" bg={colors.backgroundSecondary} borderRadius="$xl" borderWidth={1} borderColor={colors.border}>
                <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$3">New Category</Text>

                <VStack mb="$4">
                  <Text fontSize="$sm" fontWeight="$medium" color={colors.textSecondary} mb="$1">Name</Text>
                  <Input borderRadius="$lg" borderColor={errors.customName ? colors.error : colors.border} borderWidth={errors.customName ? 2 : 1} bg={colors.white}>
                    <InputField
                      placeholder="e.g. Groceries, Gym, Rent"
                      value={customName}
                      onChangeText={(text) => {
                        setCustomName(text);
                        if (errors.customName) setErrors(prev => { const { customName, ...rest } = prev; return rest; });
                      }}
                      fontSize="$md"
                    />
                  </Input>
                  {errors.customName && (
                    <Text fontSize="$xs" color={colors.error} mt="$1">{errors.customName}</Text>
                  )}
                </VStack>

                <VStack mb="$4">
                  <Text fontSize="$sm" fontWeight="$medium" color={colors.textSecondary} mb="$1">Icon</Text>
                  <HStack flexWrap="wrap" space="xs">
                    {ICON_OPTIONS.map((icon) => (
                      <Pressable
                        key={icon}
                        onPress={() => setCustomIcon(icon)}
                        w={40}
                        h={40}
                        borderRadius="$lg"
                        alignItems="center"
                        justifyContent="center"
                        bg={customIcon === icon ? customColor + '20' : colors.white}
                        borderWidth={customIcon === icon ? 2 : 1}
                        borderColor={customIcon === icon ? customColor : colors.border}
                        mb="$1.5"
                      >
                        <Icon name={icon} size={20} color={customIcon === icon ? customColor : colors.textSecondary} />
                      </Pressable>
                    ))}
                  </HStack>
                </VStack>

                <VStack mb="$4">
                  <Text fontSize="$sm" fontWeight="$medium" color={colors.textSecondary} mb="$1">Color</Text>
                  <HStack flexWrap="wrap" space="xs">
                    {COLOR_OPTIONS.map((color) => (
                      <Pressable
                        key={color}
                        onPress={() => setCustomColor(color)}
                        w={32}
                        h={32}
                        borderRadius="$full"
                        bg={color}
                        alignItems="center"
                        justifyContent="center"
                        borderWidth={customColor === color ? 3 : 0}
                        borderColor={colors.white}
                        mb="$1.5"
                        shadowColor={customColor === color ? color : 'transparent'}
                        shadowOffset={{ width: 0, height: 0 }}
                        shadowOpacity={0.5}
                        shadowRadius={4}
                        elevation={customColor === color ? 4 : 0}
                      >
                        {customColor === color && (
                          <Icon name="check" size={16} color="#FFFFFF" />
                        )}
                      </Pressable>
                    ))}
                  </HStack>
                </VStack>

                <HStack alignItems="center" space="sm" mb="$2">
                  <Text fontSize="$sm" color={colors.textSecondary}>Preview:</Text>
                  <Box bg={customColor + '20'} borderRadius="$full" p="$1.5">
                    <Icon name={customIcon} size={18} color={customColor} />
                  </Box>
                  <Text fontSize="$sm" fontWeight="$medium" color={colors.text}>
                    {customName || 'Category Name'}
                  </Text>
                </HStack>

                <Pressable
                  onPress={handleCreateCustomCategory}
                  bg={colors.primary}
                  borderRadius="$lg"
                  py="$2.5"
                  alignItems="center"
                  opacity={savingCategory ? 0.6 : 1}
                  disabled={savingCategory}
                >
                  <HStack alignItems="center" space="xs">
                    <Icon name="add-circle-outline" size={18} color={colors.white} />
                    <Text color={colors.white} fontWeight="$semibold" fontSize="$sm">
                      {savingCategory ? 'Creating...' : 'Create Category'}
                    </Text>
                  </HStack>
                </Pressable>
              </Box>
            )}

            <VStack mb="$6">
              <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Budget Amount</Text>
              <Input
                borderRadius="$lg"
                borderColor={errors.amount ? colors.error : colors.border}
                borderWidth={errors.amount ? 2 : 1}
              >
                <InputField
                  placeholder="0.00"
                  value={amount}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9.]/g, '');
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

            <VStack mb="$6">
              <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Period</Text>
              <HStack space="sm">
                {['weekly', 'monthly', 'yearly'].map((p) => (
                  <Pressable
                    key={p}
                    flex={1}
                    py="$3"
                    px="$4"
                    borderRadius="$lg"
                    borderWidth={1}
                    borderColor={period === p ? colors.primary : colors.border}
                    bg={period === p ? colors.primary : colors.white}
                    alignItems="center"
                    onPress={() => setPeriod(p)}
                  >
                    <Text
                      fontSize="$sm"
                      fontWeight="$medium"
                      color={period === p ? colors.white : colors.textSecondary}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            </VStack>

            <VStack mt="$8" space="md">
              <Pressable
                onPress={handleSave}
                bg={colors.primary}
                borderRadius="$lg"
                py="$3.5"
                alignItems="center"
              >
                <Text color={colors.white} fontWeight="$semibold" fontSize="$md">{initialData ? 'Update Budget' : 'Create Budget'}</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                borderRadius="$lg"
                py="$3.5"
                alignItems="center"
              >
                <Text color={colors.textSecondary} fontWeight="$medium" fontSize="$md">Cancel</Text>
              </Pressable>
            </VStack>
          </ScrollView>
        </Box>
      </Modal>
    </Portal>
  );
};

export default AddBudgetModal;
