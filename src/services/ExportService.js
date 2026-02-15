import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { StorageService } from './StorageService';
import RecurringExpenseService from './RecurringExpenseService';

const ExportService = {
  /**
   * Export all app data as a JSON file and open the share sheet.
   * Includes expenses, budgets, categories, recurring expenses, and settings.
   */
  async exportAsJSON() {
    try {
      const [baseExport, recurringExpenses] = await Promise.all([
        StorageService.exportData(),
        RecurringExpenseService.getRecurringExpenses(),
      ]);

      const exportData = {
        ...baseExport,
        recurringExpenses,
      };

      const fileName = `ReceiptTracker_Backup_${this._formatDateForFilename()}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(exportData, null, 2), {
        encoding: 'utf8',
      });

      await this._shareFile(filePath, 'application/json');

      return { success: true, format: 'json', filePath };
    } catch (error) {
      console.error('JSON export error:', error);
      throw new Error(`Failed to export JSON: ${error.message}`);
    }
  },

  /**
   * Export JSON with option to save using file picker or share.
   * This gives users control over where to save the file.
   */
  async exportAsJSONToDownloads() {
    try {
      const [baseExport, recurringExpenses] = await Promise.all([
        StorageService.exportData(),
        RecurringExpenseService.getRecurringExpenses(),
      ]);

      const exportData = {
        ...baseExport,
        recurringExpenses,
      };

      const fileName = `ReceiptTracker_Backup_${this._formatDateForFilename()}.json`;
      const content = JSON.stringify(exportData, null, 2);
      
      // Save to cache first
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: 'utf8',
      });

      // Use share sheet which allows saving to Downloads, Drive, etc.
      await this._shareFile(filePath, 'application/json');

      return { success: true, format: 'json', fileName };
    } catch (error) {
      console.error('JSON export error:', error);
      throw new Error(`Failed to export JSON: ${error.message}`);
    }
  },

  /**
   * Export expenses as a CSV file and open the share sheet.
   * CSV is useful for importing into spreadsheet apps.
   */
  async exportAsCSV() {
    try {
      const [expenses, categories] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getCategories(),
      ]);

      const categoryMap = {};
      categories.forEach((cat) => {
        categoryMap[cat.id] = cat.name;
      });

      const headers = ['Date', 'Vendor', 'Amount', 'Category', 'Description', 'Created At'];
      const rows = expenses
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((expense) => [
          expense.date,
          this._escapeCSV(expense.vendor),
          expense.amount.toFixed(2),
          this._escapeCSV(categoryMap[expense.category] || expense.category),
          this._escapeCSV(expense.description || expense.notes || ''),
          expense.createdAt || '',
        ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      const fileName = `ReceiptTracker_Expenses_${this._formatDateForFilename()}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: 'utf8',
      });

      await this._shareFile(filePath, 'text/csv');

      return { success: true, format: 'csv', filePath };
    } catch (error) {
      console.error('CSV export error:', error);
      throw new Error(`Failed to export CSV: ${error.message}`);
    }
  },

  /**
   * Export CSV with option to save using file picker or share.
   * This gives users control over where to save the file.
   */
  async exportAsCSVToDownloads() {
    try {
      const [expenses, categories] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getCategories(),
      ]);

      const categoryMap = {};
      categories.forEach((cat) => {
        categoryMap[cat.id] = cat.name;
      });

      const headers = ['Date', 'Vendor', 'Amount', 'Category', 'Description', 'Created At'];
      const rows = expenses
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((expense) => [
          expense.date,
          this._escapeCSV(expense.vendor),
          expense.amount.toFixed(2),
          this._escapeCSV(categoryMap[expense.category] || expense.category),
          this._escapeCSV(expense.description || expense.notes || ''),
          expense.createdAt || '',
        ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      const fileName = `ReceiptTracker_Expenses_${this._formatDateForFilename()}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: 'utf8',
      });

      // Use share sheet which allows saving to Downloads, Drive, etc.
      await this._shareFile(filePath, 'text/csv');

      return { success: true, format: 'csv', fileName };
    } catch (error) {
      console.error('CSV export error:', error);
      throw new Error(`Failed to export CSV: ${error.message}`);
    }
  },

  /**
   * Check if sharing is available on the current platform.
   */
  async isSharingAvailable() {
    return await Sharing.isAvailableAsync();
  },

  /**
   * Share a file using the native share sheet.
   */
  async _shareFile(filePath, mimeType) {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(filePath, {
      mimeType,
      dialogTitle: 'Export Receipt Tracker Data',
    });
  },


  /**
   * Escape a value for safe CSV output.
   */
  _escapeCSV(value) {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  },

  /**
   * Format the current date/time for use in a filename.
   */
  _formatDateForFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
  },
};

export default ExportService;
