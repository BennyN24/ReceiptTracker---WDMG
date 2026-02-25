import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SecuritySettings } from '../types';

const BIOMETRIC_KEY = '@biometric_enabled';
const PASSCODE_KEY = '@passcode_settings';

const BiometricService = {
  /**
   * Check if biometric authentication is available on the device.
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  },

  /**
   * Get the types of biometric authentication available.
   */
  async getBiometricTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Failed to get biometric types:', error);
      return [];
    }
  },

  /**
   * Check if biometric authentication is enabled by the user.
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Failed to check biometric status:', error);
      return false;
    }
  },

  /**
   * Enable biometric authentication.
   * Prompts the user to authenticate to verify it works before enabling.
   */
  async enableBiometric(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to enable biometric lock',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await AsyncStorage.setItem(BIOMETRIC_KEY, 'true');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  },

  /**
   * Disable biometric authentication.
   */
  async disableBiometric(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(BIOMETRIC_KEY, 'false');
      return true;
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      return false;
    }
  },

  /**
   * Authenticate the user using biometric.
   */
  async authenticate(promptMessage: string = 'Authenticate to access Receipt Tracker'): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  },

  /**
   * Check if any lock (biometric or passcode) is enabled.
   */
  async isLockEnabled(): Promise<boolean> {
    try {
      const biometricEnabled = await this.isBiometricEnabled();
      const passcodeEnabled = await this.isPasscodeEnabled();
      return biometricEnabled || passcodeEnabled;
    } catch (error) {
      console.error('Failed to check lock status:', error);
      return false;
    }
  },

  /**
   * Check if passcode lock is enabled.
   */
  async isPasscodeEnabled(): Promise<boolean> {
    try {
      const settings = await AsyncStorage.getItem(PASSCODE_KEY);
      if (settings) {
        const parsed: SecuritySettings = JSON.parse(settings);
        return parsed.passcodeEnabled === true;
      }
      return false;
    } catch (error) {
      console.error('Failed to check passcode status:', error);
      return false;
    }
  },

  /**
   * Set a new passcode.
   */
  async setPasscode(passcode: string): Promise<boolean> {
    try {
      const settings: SecuritySettings = {
        biometricEnabled: await this.isBiometricEnabled(),
        passcodeEnabled: true,
        passcode,
      };
      await AsyncStorage.setItem(PASSCODE_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to set passcode:', error);
      return false;
    }
  },

  /**
   * Verify a passcode against the stored passcode.
   */
  async verifyPasscode(passcode: string): Promise<boolean> {
    try {
      const settings = await AsyncStorage.getItem(PASSCODE_KEY);
      if (settings) {
        const parsed: SecuritySettings = JSON.parse(settings);
        return parsed.passcode === passcode;
      }
      return false;
    } catch (error) {
      console.error('Failed to verify passcode:', error);
      return false;
    }
  },

  /**
   * Remove the stored passcode.
   */
  async removePasscode(): Promise<boolean> {
    try {
      const settings: SecuritySettings = {
        biometricEnabled: await this.isBiometricEnabled(),
        passcodeEnabled: false,
      };
      await AsyncStorage.setItem(PASSCODE_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to remove passcode:', error);
      return false;
    }
  },

  /**
   * Get the biometric type label for display purposes.
   */
  async getBiometricTypeLabel(): Promise<string> {
    try {
      const types = await this.getBiometricTypes();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Fingerprint';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Iris';
      }
      return 'Biometric';
    } catch (error) {
      return 'Biometric';
    }
  },
};

export default BiometricService;
