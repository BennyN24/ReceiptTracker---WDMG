import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import {
  Card,
  Text,
  Switch,
  Button,
  TextInput,
  Dialog,
  Portal,
} from 'react-native-paper';
import BiometricService from '../services/BiometricService';

const SecuritySettingsScreen = () => {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [passcodeSet, setPasscodeSet] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState('set'); // 'set', 'verify', 'change'
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
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
  };

  const handleBiometricToggle = async (value) => {
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
  };

  const handleSetPasscode = async () => {
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
  };

  const handleChangePasscode = async () => {
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
  };

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
      <View style={styles.container}>
        <Text>Loading security settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Security Settings
        </Text>
      </View>

      {biometricAvailable && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text variant="titleMedium" style={styles.settingTitle}>
                  Biometric Authentication
                </Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Use fingerprint or face recognition to unlock the app
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
              />
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="titleMedium" style={styles.settingTitle}>
                Passcode Lock
              </Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                {passcodeSet
                  ? 'Passcode is set. Tap to change or remove.'
                  : 'Protect your app with a passcode'}
              </Text>
            </View>
          </View>

          <View style={styles.buttonGroup}>
            {!passcodeSet ? (
              <Button
                mode="contained"
                onPress={() => {
                  setPasscodeMode('set');
                  setShowPasscodeModal(true);
                }}
                style={styles.button}
              >
                Set Passcode
              </Button>
            ) : (
              <>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setPasscodeMode('change');
                    setShowPasscodeModal(true);
                  }}
                  style={styles.button}
                >
                  Change Passcode
                </Button>
                <Button
                  mode="outlined"
                  textColor="#ef4444"
                  onPress={handleRemovePasscode}
                  style={styles.button}
                >
                  Remove Passcode
                </Button>
              </>
            )}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.settingTitle}>
            Security Tips
          </Text>
          <Text variant="bodySmall" style={styles.tip}>
            • Use a strong passcode with at least 4 characters
          </Text>
          <Text variant="bodySmall" style={styles.tip}>
            • Enable biometric authentication for quick access
          </Text>
          <Text variant="bodySmall" style={styles.tip}>
            • Regularly review your security settings
          </Text>
          <Text variant="bodySmall" style={styles.tip}>
            • Keep your device software up to date
          </Text>
        </Card.Content>
      </Card>

      <Modal visible={showPasscodeModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Button onPress={() => setShowPasscodeModal(false)}>Cancel</Button>
            <Text variant="titleMedium">
              {passcodeMode === 'set'
                ? 'Set Passcode'
                : passcodeMode === 'change'
                ? 'Change Passcode'
                : 'Verify Passcode'}
            </Text>
            <Button
              onPress={
                passcodeMode === 'set'
                  ? handleSetPasscode
                  : handleChangePasscode
              }
            >
              Save
            </Button>
          </View>

          <View style={styles.modalContent}>
            {passcodeMode === 'change' && (
              <>
                <TextInput
                  label="Current Passcode"
                  value={passcode}
                  onChangeText={setPasscode}
                  secureTextEntry
                  style={styles.input}
                />
                <TextInput
                  label="New Passcode"
                  value={confirmPasscode}
                  onChangeText={setConfirmPasscode}
                  secureTextEntry
                  style={styles.input}
                />
              </>
            )}

            {passcodeMode === 'set' && (
              <>
                <TextInput
                  label="Passcode"
                  value={passcode}
                  onChangeText={setPasscode}
                  secureTextEntry
                  style={styles.input}
                />
                <TextInput
                  label="Confirm Passcode"
                  value={confirmPasscode}
                  onChangeText={setConfirmPasscode}
                  secureTextEntry
                  style={styles.input}
                />
              </>
            )}

            <Card style={styles.infoCard}>
              <Card.Content>
                <Text variant="bodySmall" style={styles.infoText}>
                  Requirements:
                </Text>
                <Text variant="bodySmall" style={styles.infoText}>
                  • Minimum 4 characters
                </Text>
                <Text variant="bodySmall" style={styles.infoText}>
                  • Can contain numbers and letters
                </Text>
              </Card.Content>
            </Card>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: '#1e293b',
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#ffffff',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    color: '#1e293b',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#64748b',
  },
  buttonGroup: {
    marginTop: 16,
    gap: 8,
  },
  button: {
    marginVertical: 4,
  },
  tip: {
    color: '#64748b',
    marginVertical: 4,
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
  infoCard: {
    marginTop: 16,
    backgroundColor: '#f0f9ff',
  },
  infoText: {
    color: '#0369a1',
    marginVertical: 2,
  },
});

export default SecuritySettingsScreen;
