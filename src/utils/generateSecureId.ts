import * as Crypto from 'expo-crypto';

/**
 * Generate a cryptographically secure unique ID.
 * Uses expo-crypto for random bytes, then converts to a hex string.
 */
const generateSecureId = async (): Promise<string> => {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    const hex = Array.from(randomBytes)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex;
  } catch (error) {
    // Fallback to a less secure but functional ID
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
};

export default generateSecureId;
