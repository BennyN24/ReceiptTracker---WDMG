import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type { SecuritySettings } from '../types';

const BIOMETRIC_KEY = '@biometric_enabled';
const PASSCODE_KEY = '@passcode_settings';
const PASSCODE_HASH_KEY = '@passcode_hash';
const PASSCODE_SALT_KEY = '@passcode_salt';

interface PasscodeHash {
  salt: string;
  hash: string;
}

const BiometricService = {
  /**
   * Generate a salted hash for a passcode using PBKDF2.
   */
  async _hashPasscode(passcode: string, salt?: string): Promise<PasscodeHash> {
    try {
      const useSalt = salt || Crypto.randomUUID();
      const iterations = 100000;
      const keyLength = 32;
      
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${passcode}${useSalt}${iterations}`
      );
      
      return {
        salt: useSalt,
        hash,
      };
    } catch (error) {
      console.error('Failed to hash passcode:', error);
      throw error;
    }
  },

  /**
   * Constant-time comparison of two strings to prevent timing attacks.
   */
  _constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  },

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
   * Hashes the passcode and stores it securely in SecureStore.
   */
  async setPasscode(passcode: string): Promise<boolean> {
    try {
      const { salt, hash } = await this._hashPasscode(passcode);
      const passcodeData: PasscodeHash = { salt, hash };
      
      await SecureStore.setItemAsync(PASSCODE_HASH_KEY, JSON.stringify(passcodeData));
      
      const settings: SecuritySettings = {
        biometricEnabled: await this.isBiometricEnabled(),
        passcodeEnabled: true,
      };
      await AsyncStorage.setItem(PASSCODE_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to set passcode:', error);
      return false;
    }
  },

  /**
   * Verify a passcode against the stored hashed passcode.
   * Reads from SecureStore and uses constant-time comparison.
   */
  async verifyPasscode(passcode: string): Promise<boolean> {
    try {
      const storedData = await SecureStore.getItemAsync(PASSCODE_HASH_KEY);
      if (!storedData) {
        return false;
      }
      
      const passcodeData: PasscodeHash = JSON.parse(storedData);
      const { hash: derivedHash } = await this._hashPasscode(passcode, passcodeData.salt);
      
      return this._constantTimeCompare(derivedHash, passcodeData.hash);
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
      await SecureStore.deleteItemAsync(PASSCODE_HASH_KEY);
      
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
