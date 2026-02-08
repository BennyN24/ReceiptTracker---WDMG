import * as FileSystem from 'expo-file-system';
import { File, Directory } from 'expo-file-system';

const getReceiptImagesDir = () => {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory not available');
  }
  return `${FileSystem.documentDirectory}receipt_images/`;
};

/**
 * Service for persisting captured receipt images to the device filesystem.
 * Images are stored in a dedicated directory under the app's document directory
 * with unique filenames based on timestamp + random suffix.
 */
const ImageStorageService = {
  /**
   * Ensure the receipt images directory exists
   */
  async _ensureDirectory() {
    try {
      const dirPath = getReceiptImagesDir();
      const dir = new Directory(dirPath);
      const exists = await dir.exists();
      if (!exists) {
        await dir.create();
      }
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  },

  /**
   * Save a captured receipt image to persistent storage.
   * @param {string} sourceUri - The temporary URI of the captured/picked image
   * @returns {Promise<string>} The permanent file URI of the saved image
   */
  async saveReceiptImage(sourceUri) {
    if (!sourceUri || typeof sourceUri !== 'string') {
      throw new Error('Invalid source URI');
    }

    await this._ensureDirectory();

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = this._getExtension(sourceUri);
    const filename = `receipt_${timestamp}_${randomSuffix}${extension}`;
    const destinationUri = `${getReceiptImagesDir()}${filename}`;

    try {
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destinationUri,
      });

      // Verify the file was saved
      const file = new File(destinationUri);
      if (!(await file.exists())) {
        throw new Error('File copy succeeded but file not found at destination');
      }

      return destinationUri;
    } catch (error) {
      console.error('Failed to save receipt image:', error);
      throw new Error(`Failed to save receipt image: ${error.message}`);
    }
  },

  /**
   * Delete a saved receipt image
   * @param {string} imageUri - The URI of the image to delete
   */
  async deleteReceiptImage(imageUri) {
    if (!imageUri || typeof imageUri !== 'string') return;

    try {
      const file = new File(imageUri);
      if (await file.exists()) {
        await file.delete();
      }
    } catch (error) {
      console.warn('Failed to delete receipt image:', error);
    }
  },

  /**
   * Get all saved receipt images
   * @returns {Promise<string[]>} Array of image URIs
   */
  async getAllReceiptImages() {
    try {
      await this._ensureDirectory();
      const dirPath = getReceiptImagesDir();
      const dir = new Directory(dirPath);
      const files = await dir.list();
      return files.map(file => `${dirPath}${file}`);
    } catch (error) {
      console.error('Failed to list receipt images:', error);
      return [];
    }
  },

  /**
   * Get the total size of all stored receipt images in bytes
   * @returns {Promise<number>} Total size in bytes
   */
  async getStorageUsage() {
    try {
      const images = await this.getAllReceiptImages();
      let totalSize = 0;
      for (const uri of images) {
        const file = new File(uri);
        if (await file.exists()) {
          totalSize += await file.size();
        }
      }
      return totalSize;
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
      return 0;
    }
  },

  /**
   * Read an image as base64 string (for API calls)
   * @param {string} imageUri - The URI of the image
   * @returns {Promise<string>} Base64-encoded image data
   */
  async readImageAsBase64(imageUri) {
    if (!imageUri || typeof imageUri !== 'string') {
      throw new Error('Invalid image URI');
    }

    try {
      const file = new File(imageUri);
      const base64 = await file.base64();
      return base64;
    } catch (error) {
      console.error('Failed to read image as base64:', error);
      throw new Error(`Failed to read image: ${error.message}`);
    }
  },

  /**
   * Extract file extension from URI
   * @param {string} uri
   * @returns {string} Extension including dot, defaults to .jpg
   */
  _getExtension(uri) {
    const match = uri.match(/\.(\w+)(?:\?.*)?$/);
    if (match) {
      const ext = match[1].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)) {
        return `.${ext}`;
      }
    }
    return '.jpg';
  },
};

export default ImageStorageService;
