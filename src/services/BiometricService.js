import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@receipt_tracker_biometric_enabled';
const PASSCODE_KEY = '@receipt_tracker_passcode';
const PASSCODE_SALT_KEY = '@receipt_tracker_passcode_salt';
const BIOMETRIC_TYPE_KEY = '@receipt_tracker_biometric_type';

const BiometricService = {
  /**
   * Check if biometric authentication is available on device
   */
  async isBiometricAvailable() {
    try {
      // This is a placeholder - in production, use expo-local-authentication
      // import * as LocalAuthentication from 'expo-local-authentication';
      // const compatible = await LocalAuthentication.hasHardwareAsync();
      // const enrolled = await LocalAuthentication.isEnrolledAsync();
      // return compatible && enrolled;

      return false; // Placeholder
    } catch (error) {
      console.error('Biometric availability check error:', error);
      return false;
    }
  },

  /**
   * Get available biometric types
   */
  async getAvailableBiometricTypes() {
    try {
      // Placeholder - in production:
      // const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      // return types.map(type => {
      //   if (type === LocalAuthentication.AuthenticationType.FINGERPRINT) return 'fingerprint';
      //   if (type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) return 'face';
      //   return 'iris';
      // });

      return [];
    } catch (error) {
      console.error('Get biometric types error:', error);
      return [];
    }
  },

  /**
   * Enable biometric authentication
   */
  async enableBiometric() {
    try {
      const available = await this.isBiometricAvailable();
      if (!available) {
        throw new Error('Biometric not available on this device');
      }

      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      return true;
    } catch (error) {
      console.error('Enable biometric error:', error);
      return false;
    }
  },

  /**
   * Disable biometric authentication
   */
  async disableBiometric() {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      return true;
    } catch (error) {
      console.error('Disable biometric error:', error);
      return false;
    }
  },

  /**
   * Check if biometric is enabled
   */
  async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Check biometric enabled error:', error);
      return false;
    }
  },

  /**
   * Authenticate with biometric
   */
  async authenticate() {
    try {
      const enabled = await this.isBiometricEnabled();
      if (!enabled) {
        return false;
      }

      // Placeholder - in production:
      // const result = await LocalAuthentication.authenticateAsync({
      //   disableDeviceFallback: false,
      //   reason: 'Authenticate to access ReceiptTracker',
      // });
      // return result.success;

      return true; // Placeholder
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  },

  /**
   * Set passcode lock
   */
  async setPasscode(passcode) {
    try {
      if (!passcode || passcode.length < 4) {
        throw new Error('Passcode must be at least 4 characters');
      }

      // Hash the passcode before storing
      const hashedPasscode = await this._hashPasscode(passcode);
      await SecureStore.setItemAsync(PASSCODE_KEY, hashedPasscode);

      return true;
    } catch (error) {
      console.error('Set passcode error:', error);
      return false;
    }
  },

  /**
   * Verify passcode
   */
  async verifyPasscode(passcode) {
    try {
      const storedHash = await SecureStore.getItemAsync(PASSCODE_KEY);
      if (!storedHash) {
        return false;
      }

      const inputHash = await this._hashPasscode(passcode);
      return inputHash === storedHash;
    } catch (error) {
      console.error('Verify passcode error:', error);
      return false;
    }
  },

  /**
   * Check if passcode is set
   */
  async isPasscodeSet() {
    try {
      const passcode = await SecureStore.getItemAsync(PASSCODE_KEY);
      return !!passcode;
    } catch (error) {
      console.error('Check passcode error:', error);
      return false;
    }
  },

  /**
   * Remove passcode lock
   */
  async removePasscode() {
    try {
      await SecureStore.deleteItemAsync(PASSCODE_KEY);
      await SecureStore.deleteItemAsync(PASSCODE_SALT_KEY);
      return true;
    } catch (error) {
      console.error('Remove passcode error:', error);
      return false;
    }
  },

  /**
   * Generate a cryptographically random salt
   */
  async _generateSalt() {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(16);
      return Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('Generate salt error:', error);
      return null;
    }
  },

  /**
   * Get or create salt for passcode hashing
   */
  async _getSalt() {
    try {
      const existingSalt = await SecureStore.getItemAsync(PASSCODE_SALT_KEY);
      if (existingSalt) return existingSalt;

      const newSalt = await this._generateSalt();
      if (!newSalt) throw new Error('Failed to generate salt');

      await SecureStore.setItemAsync(PASSCODE_SALT_KEY, newSalt);
      return newSalt;
    } catch (error) {
      console.error('Get salt error:', error);
      return null;
    }
  },

  /**
   * Hash passcode using SHA256 with unique salt
   */
  async _hashPasscode(passcode) {
    try {
      const salt = await this._getSalt();
      if (!salt) throw new Error('Failed to retrieve salt for hashing');

      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        salt + passcode
      );
    } catch (error) {
      console.error('Hash passcode error:', error);
      return null;
    }
  },

  /**
   * Get authentication status
   */
  async getAuthStatus() {
    try {
      const biometricEnabled = await this.isBiometricEnabled();
      const passcodeSet = await this.isPasscodeSet();
      const biometricAvailable = await this.isBiometricAvailable();

      return {
        biometricEnabled,
        biometricAvailable,
        passcodeSet,
        authRequired: biometricEnabled || passcodeSet,
      };
    } catch (error) {
      console.error('Get auth status error:', error);
      return {
        biometricEnabled: false,
        biometricAvailable: false,
        passcodeSet: false,
        authRequired: false,
      };
    }
  },
};

export default BiometricService;
