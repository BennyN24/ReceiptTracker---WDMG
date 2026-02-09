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

const AddBudgetModal = ({ onClose, onSave, visible, initialData }) => {
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAmount(String(initialData.amount));
      setPeriod(initialData.period);
    } else {
      setName('');
      setAmount('');
      setPeriod('monthly');
    }
  }, [initialData, visible]);

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Budget name is required';
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

    const budgetData = {
      name: name.trim(),
      amount: parseFloat(amount),
      period,
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
              <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Budget Name</Text>
              <Input
                borderRadius="$lg"
                borderColor={errors.name ? colors.error : colors.border}
                borderWidth={errors.name ? 2 : 1}
              >
                <InputField
                  placeholder="e.g. Monthly Expenses"
                  value={name}
                  onChangeText={setName}
                  fontSize="$md"
                />
              </Input>
              {errors.name && (
                <Text fontSize="$xs" color={colors.error} mt="$1">{errors.name}</Text>
              )}
            </VStack>

            <VStack mb="$6">
              <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Budget Amount ($)</Text>
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
