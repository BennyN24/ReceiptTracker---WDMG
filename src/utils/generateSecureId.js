import * as Crypto from 'expo-crypto';

/**
 * Generate a cryptographically secure unique ID
 * Uses expo-crypto for random byte generation instead of Math.random()
 * @param {string} [prefix] - Optional prefix for the ID
 * @returns {Promise<string>} A secure unique identifier
 */
const generateSecureId = async (prefix = '') => {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    const hex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const timestamp = Date.now().toString(36);
    const id = `${timestamp}_${hex}`;
    return prefix ? `${prefix}_${id}` : id;
  } catch (error) {
    // Fallback to timestamp + crypto digest if getRandomBytesAsync fails
    console.warn('Secure ID generation fallback:', error);
    const fallback = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Date.now().toString() + Math.random().toString()
    );
    const id = fallback.substring(0, 32);
    return prefix ? `${prefix}_${id}` : id;
  }
};

export default generateSecureId;
