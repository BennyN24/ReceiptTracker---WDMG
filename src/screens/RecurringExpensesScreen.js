import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Alert,
  Modal,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Pressable,
  ScrollView,
  Input,
  InputField,
  Spinner,
} from '@gluestack-ui/themed';
import DateTimePicker from '@react-native-community/datetimepicker';
import RecurringExpenseService from '../services/RecurringExpenseService';
import StorageService from '../services/StorageService';
import { useThemeColors } from '../hooks/useThemeColors';
import Icon from '@expo/vector-icons/MaterialIcons';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const RecurringExpensesScreen = () => {
  const colors = useThemeColors();
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
    receiptImage: null,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showFullImage, setShowFullImage] = useState(false);

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
        receiptImage: formData.receiptImage || null,
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
    console.log('handleDeleteExpense called with id:', id);
    setDeletingId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    console.log('Delete confirmed, deleting id:', deletingId);
    try {
      await RecurringExpenseService.deleteRecurringExpense(deletingId);
      await loadRecurringExpenses();
      console.log('Delete successful');
      setShowDeleteModal(false);
      setDeletingId(null);
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete recurring expense');
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  const cancelDelete = () => {
    console.log('Delete cancelled');
    setShowDeleteModal(false);
    setDeletingId(null);
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
      receiptImage: expense.receiptImage || null,
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
      receiptImage: null,
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
    <Box mb="$3" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
      <HStack justifyContent="space-between" alignItems="flex-start" mb="$3">
        <VStack flex={1}>
          <Text fontWeight="$semibold" fontSize="$md" color={colors.text}>{item.vendor}</Text>
          <Text fontSize="$sm" color={colors.textSecondary} mt="$1">
            {RecurringExpenseService.getFrequencyLabel(item.frequency)}
          </Text>
        </VStack>
        <Text fontWeight="$bold" fontSize="$md" color={colors.primary}>${item.amount.toFixed(2)}</Text>
      </HStack>

      <HStack justifyContent="space-between" mb="$2">
        <Text fontSize="$sm" color={colors.textSecondary}>{item.category}</Text>
        <Text fontSize="$sm" color={colors.textSecondary}>Next: {item.nextDueDate.split('T')[0]}</Text>
      </HStack>

      {item.notes && (
        <Text fontSize="$sm" color={colors.textSecondary} fontStyle="italic" my="$2">{item.notes}</Text>
      )}

      <HStack space="$md" mt="$3">
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            handleEditExpense(item);
          }}
          borderWidth={1}
          borderColor={colors.primary}
          borderRadius="$lg"
          px="$4"
          py="$2"
          flex={1}
          alignItems="center"
          
        >
          <Text color={colors.primary} fontWeight="$medium" fontSize="$sm">Edit</Text>
        </Pressable>
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            handleDeleteExpense(item.id);
          }}
          borderWidth={1}
          borderColor={colors.error}
          borderRadius="$lg"
          px="$4"
          py="$2"
          flex={1}
          alignItems="center"
        >
          <Text color={colors.error} fontWeight="$medium" fontSize="$sm">Delete</Text>
        </Pressable>
      </HStack>
    </Box>
  );

  return (
    <Box flex={1} bg={colors.backgroundSecondary}>
      <ScrollView
        flex={1}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <Box flex={1} justifyContent="center" alignItems="center" py="$16">
            <Spinner size="large" color={colors.primary} />
            <Text mt="$3" color={colors.textSecondary}>Loading recurring expenses...</Text>
          </Box>
        ) : recurringExpenses.length === 0 ? (
          <VStack alignItems="center" justifyContent="center" py="$16" px="$5">
            <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mt="$4">No recurring expenses yet</Text>
            <Text fontSize="$sm" color={colors.textSecondary} mt="$2">Create one to automate your regular expenses</Text>
          </VStack>
        ) : (
          <FlatList
            data={recurringExpenses}
            renderItem={renderExpenseItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ padding: 16 }}
          />
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => { resetForm(); setShowModal(true); }}
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
        <Text color={colors.white} fontSize="$2xl" fontWeight="$bold">+</Text>
      </Pressable>

      <Modal visible={showModal} animationType="slide">
        <Box flex={1} bg={colors.backgroundSecondary}>
          <HStack justifyContent="space-between" alignItems="center" px="$4" pt="$12" pb="$2" borderBottomWidth={1} borderBottomColor={colors.border} bg={colors.white}>
            <Pressable onPress={() => setShowModal(false)} py="$2">
              <Text color={colors.textSecondary} fontWeight="$medium">Cancel</Text>
            </Pressable>
            <Text fontWeight="$semibold" fontSize="$md" color={colors.text}>
              {editingId ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
            </Text>
            <Pressable onPress={handleAddExpense} py="$2">
              <Text color={colors.primary} fontWeight="$semibold">Save</Text>
            </Pressable>
          </HStack>

          <ScrollView flex={1} bg={colors.white} p="$4">
            {/* Receipt Image Preview */}
            {formData.receiptImage && (
              <VStack mb="$4">
                <HStack alignItems="center" justifyContent="space-between" mb="$2">
                  <Text fontWeight="$medium" fontSize="$sm" color={colors.text}>Receipt Image</Text>
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
                      source={{ uri: formData.receiptImage }}
                      style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                    />
                  </Box>
                </Pressable>
              </VStack>
            )}

            <VStack mb="$4">
              <Text fontWeight="$medium" fontSize="$sm" color={colors.text} mb="$2">Vendor</Text>
              <Input borderRadius="$lg" borderColor={colors.border} bg={colors.white}>
                <InputField placeholder="Vendor" value={formData.vendor} onChangeText={text => setFormData({ ...formData, vendor: text })} fontSize="$md" />
              </Input>
            </VStack>

            <VStack mb="$4">
              <Text fontWeight="$medium" fontSize="$sm" color={colors.text} mb="$2">Amount</Text>
              <Input borderRadius="$lg" borderColor={colors.border} bg={colors.white}>
                <InputField placeholder="0.00" value={formData.amount} onChangeText={text => setFormData({ ...formData, amount: text })} keyboardType="decimal-pad" fontSize="$md" />
              </Input>
            </VStack>

            <VStack mb="$4">
              <Text fontWeight="$medium" fontSize="$sm" color={colors.text} mb="$2">Category</Text>
              <HStack flexWrap="wrap" space="$sm">
                {categories.map(cat => (
                  <Pressable
                    key={cat}
                    onPress={() => setFormData({ ...formData, category: cat })}
                    bg={formData.category === cat ? colors.primary : colors.white}
                    borderWidth={1}
                    borderColor={formData.category === cat ? colors.primary : colors.border}
                    borderRadius="$full"
                    px="$3"
                    py="$1.5"
                    mb="$2"
                    mr="$2"
                  >
                    <Text fontSize="$xs" fontWeight="$medium" color={formData.category === cat ? colors.white : colors.textSecondary}>{cat}</Text>
                  </Pressable>
                ))}
              </HStack>
            </VStack>

            <VStack mb="$4">
              <Text fontWeight="$medium" fontSize="$sm" color={colors.text} mb="$2">Frequency</Text>
              <HStack space="$sm" flexWrap="wrap">
                {frequencyOptions.map(opt => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setFormData({ ...formData, frequency: opt.value })}
                    bg={formData.frequency === opt.value ? colors.primary : colors.white}
                    borderWidth={1}
                    borderColor={formData.frequency === opt.value ? colors.primary : colors.border}
                    borderRadius="$lg"
                    px="$4"
                    py="$2.5"
                    mb="$2"
                    mr="$2"
                  >
                    <Text fontSize="$sm" fontWeight="$medium" color={formData.frequency === opt.value ? colors.white : colors.textSecondary}>{opt.label}</Text>
                  </Pressable>
                ))}
              </HStack>
            </VStack>

            <HStack mb="$4" space="md">
              <VStack flex={1}>
                <Text fontWeight="$medium" fontSize="$sm" color={colors.text} mb="$2">Start Date</Text>
                <Pressable
                  onPress={() => { setDatePickerMode('start'); setShowDatePicker(true); }}
                  borderWidth={1}
                  borderColor={colors.primary}
                  borderRadius="$lg"
                  py="$2.5"
                  alignItems="center"
                >
                  <Text color={colors.primary} fontWeight="$medium">{formData.startDate}</Text>
                </Pressable>
              </VStack>

              <VStack flex={1}>
                <Text fontWeight="$medium" fontSize="$sm" color={colors.text} mb="$2">End Date (Optional)</Text>
                <Pressable
                  onPress={() => { setDatePickerMode('end'); setShowDatePicker(true); }}
                  borderWidth={1}
                  borderColor={colors.primary}
                  borderRadius="$lg"
                  py="$2.5"
                  alignItems="center"
                >
                  <Text color={colors.primary} fontWeight="$medium">{formData.endDate || 'No end date'}</Text>
                </Pressable>
              </VStack>
            </HStack>

            <VStack mb="$4" pb="$6">
              <Text fontWeight="$medium" fontSize="$sm" color={colors.text} mb="$2">Notes (Optional)</Text>
              <Input borderRadius="$lg" borderColor={colors.border} bg={colors.white} h={80}>
                <InputField placeholder="Notes" value={formData.notes} onChangeText={text => setFormData({ ...formData, notes: text })} fontSize="$md" multiline numberOfLines={3} textAlignVertical="top" />
              </Input>
            </VStack>
          </ScrollView>
        </Box>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(datePickerMode === 'start' ? formData.startDate : formData.endDate || new Date())}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

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
              source={{ uri: formData.receiptImage }}
              style={{
                width: Dimensions.get('window').width,
                height: Dimensions.get('window').height * 0.85,
                resizeMode: 'contain',
              }}
            />
          </ScrollView>
        </Box>
      </Modal>

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        title="Delete Recurring Expense"
        message="Are you sure you want to delete this recurring expense?"
      />
    </Box>
  );
};

export default RecurringExpensesScreen;
