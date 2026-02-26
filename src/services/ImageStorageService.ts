import { File, Directory, Paths } from 'expo-file-system';

const RECEIPT_DIR_NAME = 'receipt_images';

/**
 * Service for persisting captured receipt images to the device filesystem.
 * Images are stored in a dedicated directory under the app's cache directory
 * with unique filenames based on timestamp + random suffix.
 *
 * Uses Expo SDK 54+ File/Directory/Paths API.
 */
const ImageStorageService = {
  /**
   * Get or create the receipt images directory
   */
  _getDirectory(): Directory {
    return new Directory(Paths.cache, RECEIPT_DIR_NAME);
  },

  /**
   * Ensure the receipt images directory exists
   */
  _ensureDirectory(): void {
    try {
      const dir = this._getDirectory();
      if (!dir.exists) {
        dir.create();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Could not create directory:', message);
    }
  },

  /**
   * Save a captured receipt image to persistent storage.
   */
  async saveReceiptImage(sourceUri: string): Promise<string> {
    if (!sourceUri || typeof sourceUri !== 'string') {
      throw new Error('Invalid source URI');
    }

    try {
      this._ensureDirectory();

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const extension = this._getExtension(sourceUri);
      const filename = `receipt_${timestamp}_${randomSuffix}${extension}`;

      const sourceFile = new File(sourceUri);
      const destDir = this._getDirectory();
      const destFile = new File(destDir, filename);

      sourceFile.copy(destDir);

      // The copy places the file with the original name, so rename it
      const copiedFile = new File(destDir, sourceFile.name);
      if (copiedFile.exists && copiedFile.uri !== destFile.uri) {
        copiedFile.rename(filename);
      }

      // Verify
      const finalFile = new File(destDir, filename);
      if (finalFile.exists) {
        return finalFile.uri;
      }

      // If rename didn't work, the copied file with original name is still valid
      if (copiedFile.exists) {
        return copiedFile.uri;
      }

      return sourceUri;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Failed to save receipt image, using original URI:', message);
      return sourceUri;
    }
  },

  /**
   * Delete a saved receipt image
   */
  async deleteReceiptImage(imageUri: string): Promise<void> {
    if (!imageUri || typeof imageUri !== 'string') return;

    try {
      const file = new File(imageUri);
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      console.warn('Failed to delete receipt image:', error);
    }
  },

  /**
   * Get all saved receipt images
   */
  async getAllReceiptImages(): Promise<string[]> {
    try {
      this._ensureDirectory();
      const dir = this._getDirectory();
      const entries = dir.list();
      return entries
        .filter((entry: File | Directory) => entry instanceof File)
        .map((file: File | Directory) => (file as File).uri);
    } catch (error) {
      console.error('Failed to list receipt images:', error);
      return [];
    }
  },

  /**
   * Get the total size of all stored receipt images in bytes
   */
  async getStorageUsage(): Promise<number> {
    try {
      const images = await this.getAllReceiptImages();
      let totalSize = 0;
      for (const uri of images) {
        const file = new File(uri);
        if (file.exists) {
          totalSize += file.size || 0;
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
   */
  async readImageAsBase64(imageUri: string): Promise<string> {
    if (!imageUri || typeof imageUri !== 'string') {
      throw new Error('Invalid image URI');
    }

    try {
      const file = new File(imageUri);
      const base64: string = await file.base64();
      return base64;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to read image as base64:', error);
      throw new Error(`Failed to read image: ${message}`);
    }
  },

  /**
   * Extract file extension from URI
   */
  _getExtension(uri: string): string {
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
