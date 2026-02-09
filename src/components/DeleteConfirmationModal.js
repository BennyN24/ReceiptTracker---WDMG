import React, { useContext } from 'react';
import {
  Modal,
} from 'react-native';
import {
  Box,
  Text,
  HStack,
  VStack,
  Pressable,
} from '@gluestack-ui/themed';
import { useThemeColors } from '../hooks/useThemeColors';

const DeleteConfirmationModal = ({ visible, onConfirm, onCancel, title = 'Delete Item', message = 'Are you sure you want to delete this item?' }) => {
  const colors = useThemeColors();
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Box flex={1} bg="rgba(0, 0, 0, 0.5)" justifyContent="center" alignItems="center">
        <Box bg={colors.white} borderRadius="$2xl" p="$6" maxWidth={300} width="90%">
          <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mb="$2">{title}</Text>
          <Text fontSize="$md" color={colors.textSecondary} mb="$6">{message}</Text>
          
          <HStack space="$md" justifyContent="flex-end">
            <Pressable
              onPress={onCancel}
              borderRadius="$lg"
              px="$4"
              py="$2.5"
              bg={colors.borderLight}
            >
              <Text color={colors.text} fontWeight="$medium">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              borderRadius="$lg"
              px="$4"
              py="$2.5"
              bg={colors.error}
            >
              <Text color={colors.white} fontWeight="$semibold">Delete</Text>
            </Pressable>
          </HStack>
        </Box>
      </Box>
    </Modal>
  );
};

export default DeleteConfirmationModal;
