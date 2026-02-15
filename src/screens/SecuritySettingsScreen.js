import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Modal,
  Switch,
  RefreshControl,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Heading,
  Pressable,
  ScrollView,
  Input,
  InputField,
  Spinner,
} from '@gluestack-ui/themed';
import BiometricService from '../services/BiometricService';
import { useThemeColors } from '../hooks/useThemeColors';

const SecuritySettingsScreen = () => {
  const colors = useThemeColors();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [passcodeSet, setPasscodeSet] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState('set'); // 'set', 'verify', 'change'
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = useCallback(async () => {
    try {
      setLoading(true);
      const available = await BiometricService.isBiometricAvailable();
      const enabled = await BiometricService.isBiometricEnabled();
      const passcodeExists = await BiometricService.isPasscodeSet();

      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
      setPasscodeSet(passcodeExists);
    } catch (error) {
      console.error('Load security settings error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSecuritySettings();
    setRefreshing(false);
  }, [loadSecuritySettings]);

  const handleBiometricToggle = useCallback(async (value) => {
    try {
      if (value) {
        const available = await BiometricService.isBiometricAvailable();
        if (!available) {
          Alert.alert(
            'Biometric Not Available',
            'Your device does not support biometric authentication'
          );
          return;
        }

        const success = await BiometricService.enableBiometric();
        if (success) {
          setBiometricEnabled(true);
          Alert.alert('Success', 'Biometric authentication enabled');
        }
      } else {
        const success = await BiometricService.disableBiometric();
        if (success) {
          setBiometricEnabled(false);
          Alert.alert('Success', 'Biometric authentication disabled');
        }
      }
    } catch (error) {
      console.error('Toggle biometric error:', error);
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  }, []);

  const handleSetPasscode = useCallback(async () => {
    try {
      if (!passcode || passcode.length < 4) {
        Alert.alert('Validation Error', 'Passcode must be at least 4 characters');
        return;
      }

      if (passcode !== confirmPasscode) {
        Alert.alert('Validation Error', 'Passcodes do not match');
        return;
      }

      const success = await BiometricService.setPasscode(passcode);
      if (success) {
        setPasscodeSet(true);
        setShowPasscodeModal(false);
        setPasscode('');
        setConfirmPasscode('');
        Alert.alert('Success', 'Passcode set successfully');
      }
    } catch (error) {
      console.error('Set passcode error:', error);
      Alert.alert('Error', 'Failed to set passcode');
    }
  }, [passcode, confirmPasscode]);

  const handleChangePasscode = useCallback(async () => {
    try {
      // First verify current passcode
      const verified = await BiometricService.verifyPasscode(passcode);
      if (!verified) {
        Alert.alert('Error', 'Current passcode is incorrect');
        return;
      }

      if (!confirmPasscode || confirmPasscode.length < 4) {
        Alert.alert('Validation Error', 'New passcode must be at least 4 characters');
        return;
      }

      const success = await BiometricService.setPasscode(confirmPasscode);
      if (success) {
        setShowPasscodeModal(false);
        setPasscode('');
        setConfirmPasscode('');
        Alert.alert('Success', 'Passcode changed successfully');
      }
    } catch (error) {
      console.error('Change passcode error:', error);
      Alert.alert('Error', 'Failed to change passcode');
    }
  }, [passcode, confirmPasscode]);

  const handleRemovePasscode = () => {
    Alert.alert(
      'Remove Passcode',
      'Are you sure you want to remove the passcode lock?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              const success = await BiometricService.removePasscode();
              if (success) {
                setPasscodeSet(false);
                Alert.alert('Success', 'Passcode removed');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove passcode');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg={colors.backgroundSecondary}>
        <Spinner size="large" color={colors.primary} />
        <Text mt="$3" color={colors.textSecondary}>Loading security settings...</Text>
      </Box>
    );
  }

  return (
    <ScrollView
      bg={colors.backgroundSecondary}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      <Box px="$4" pt="$4" pb="$2">
        <Heading size="xl" color={colors.text}>Security Settings</Heading>
      </Box>

      {biometricAvailable && (
        <Box mx="$4" my="$2" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
          <HStack justifyContent="space-between" alignItems="center">
            <VStack flex={1} mr="$3">
              <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$1">
                Biometric Authentication
              </Text>
              <Text fontSize="$sm" color={colors.textSecondary}>
                Use fingerprint or face recognition to unlock the app
              </Text>
            </VStack>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: '#e2e8f0', true: colors.primaryLighter }}
              thumbColor={biometricEnabled ? colors.primary : '#ffffff'}
            />
          </HStack>
        </Box>
      )}

      <Box mx="$4" my="$2" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <VStack>
          <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$1">
            Passcode Lock
          </Text>
          <Text fontSize="$sm" color={colors.textSecondary}>
            {passcodeSet
              ? 'Passcode is set. Tap to change or remove.'
              : 'Protect your app with a passcode'}
          </Text>
        </VStack>

        <VStack mt="$4" space="sm">
          {!passcodeSet ? (
            <Pressable
              onPress={() => { setPasscodeMode('set'); setShowPasscodeModal(true); }}
              bg={colors.primary}
              borderRadius="$lg"
              py="$3"
              alignItems="center"
            >
              <Text color={colors.white} fontWeight="$semibold">Set Passcode</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => { setPasscodeMode('change'); setShowPasscodeModal(true); }}
                borderWidth={1.5}
                borderColor={colors.primary}
                borderRadius="$lg"
                py="$3"
                alignItems="center"
              >
                <Text color={colors.primary} fontWeight="$semibold">Change Passcode</Text>
              </Pressable>
              <Pressable
                onPress={handleRemovePasscode}
                borderWidth={1.5}
                borderColor={colors.error}
                borderRadius="$lg"
                py="$3"
                alignItems="center"
              >
                <Text color={colors.error} fontWeight="$semibold">Remove Passcode</Text>
              </Pressable>
            </>
          )}
        </VStack>
      </Box>

      <Box mx="$4" my="$2" bg={colors.white} borderRadius="$xl" p="$4" shadowColor={colors.black} shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.06} shadowRadius={4} elevation={2}>
        <Text fontWeight="$semibold" fontSize="$md" color={colors.text} mb="$2">Security Tips</Text>
        <Text fontSize="$sm" color={colors.textSecondary} my="$1">• Use a strong passcode with at least 4 characters</Text>
        <Text fontSize="$sm" color={colors.textSecondary} my="$1">• Enable biometric authentication for quick access</Text>
        <Text fontSize="$sm" color={colors.textSecondary} my="$1">• Regularly review your security settings</Text>
        <Text fontSize="$sm" color={colors.textSecondary} my="$1">• Keep your device software up to date</Text>
      </Box>

      <Modal visible={showPasscodeModal} animationType="slide">
        <Box flex={1} bg={colors.backgroundSecondary}>
          <HStack justifyContent="space-between" alignItems="center" px="$4" pt="$12" pb="$2" borderBottomWidth={1} borderBottomColor={colors.border} bg={colors.white}>
            <Pressable onPress={() => setShowPasscodeModal(false)} py="$2">
              <Text color={colors.textSecondary} fontWeight="$medium">Cancel</Text>
            </Pressable>
            <Text fontWeight="$semibold" fontSize="$md" color={colors.text}>
              {passcodeMode === 'set'
                ? 'Set Passcode'
                : passcodeMode === 'change'
                ? 'Change Passcode'
                : 'Verify Passcode'}
            </Text>
            <Pressable
              onPress={passcodeMode === 'set' ? handleSetPasscode : handleChangePasscode}
              py="$2"
            >
              <Text color={colors.primary} fontWeight="$semibold">Save</Text>
            </Pressable>
          </HStack>

          <VStack flex={1} p="$4">
            {passcodeMode === 'change' && (
              <>
                <VStack mb="$4">
                  <Text fontWeight="$medium" fontSize="$sm" color={colors.text} mb="$2">Current Passcode</Text>
                  <Input borderRadius="$lg" borderColor={colors.border}>
                    <InputField value={passcode} onChangeText={setPasscode} secureTextEntry fontSize="$md" placeholder="Current Passcode" />
                  </Input>
                </VStack>
                <VStack mb="$4">
                  <Text fontWeight="$medium" fontSize="$sm" color={colors.text} mb="$2">New Passcode</Text>
                  <Input borderRadius="$lg" borderColor={colors.border}>
                    <InputField value={confirmPasscode} onChangeText={setConfirmPasscode} secureTextEntry fontSize="$md" placeholder="New Passcode" />
                  </Input>
                </VStack>
              </>
            )}

            {passcodeMode === 'set' && (
              <>
                <VStack mb="$4">
                  <Text fontWeight="$medium" fontSize="$sm" color={colors.text} mb="$2">Passcode</Text>
                  <Input borderRadius="$lg" borderColor={colors.border}>
                    <InputField value={passcode} onChangeText={setPasscode} secureTextEntry fontSize="$md" placeholder="Passcode" />
                  </Input>
                </VStack>
                <VStack mb="$4">
                  <Text fontWeight="$medium" fontSize="$sm" color={colors.text} mb="$2">Confirm Passcode</Text>
                  <Input borderRadius="$lg" borderColor={colors.border}>
                    <InputField value={confirmPasscode} onChangeText={setConfirmPasscode} secureTextEntry fontSize="$md" placeholder="Confirm Passcode" />
                  </Input>
                </VStack>
              </>
            )}

            <Box mt="$4" bg={colors.primaryLightest} borderRadius="$xl" p="$4">
              <Text fontSize="$sm" color={colors.primaryDark} fontWeight="$medium" mb="$1">Requirements:</Text>
              <Text fontSize="$sm" color={colors.primaryDark} my="$0.5">• Minimum 4 characters</Text>
              <Text fontSize="$sm" color={colors.primaryDark} my="$0.5">• Can contain numbers and letters</Text>
            </Box>
          </VStack>
        </Box>
      </Modal>
    </ScrollView>
  );
};

export default SecuritySettingsScreen;
