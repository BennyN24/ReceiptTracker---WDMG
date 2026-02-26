import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { StorageService } from './StorageService';
import { ProfileService } from './ProfileService';
import RecurringExpenseService from './RecurringExpenseService';
import { APP_VERSION } from '../config/app';
import type { ExportResult, ExportData, MultiProfileExportData, Expense, Category, Profile } from '../types';

const ExportService = {
  /**
   * Export current profile data as a JSON file and open the share sheet.
   */
  async exportAsJSON(): Promise<ExportResult> {
    try {
      const [baseExport, recurringExpenses, activeProfile] = await Promise.all([
        StorageService.exportData(),
        RecurringExpenseService.getRecurringExpenses(),
        ProfileService.getActiveProfile(),
      ]);

      const exportData: ExportData = {
        ...baseExport,
        recurringExpenses,
        profileId: activeProfile.id,
        profileName: activeProfile.name,
      };

      const fileName = `ReceiptTracker_${activeProfile.name}_${this._formatDateForFilename()}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(exportData, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await this._shareFile(filePath, 'application/json');

      return { success: true, format: 'json', filePath };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('JSON export error:', error);
      throw new Error(`Failed to export JSON: ${message}`);
    }
  },

  /**
   * Export ALL profiles and their data as a JSON file.
   */
  async exportAllProfilesAsJSON(): Promise<ExportResult> {
    const [profiles, activeProfileId] = await Promise.all([
      ProfileService.getProfiles(),
      ProfileService.getActiveProfileId(),
    ]);

    try {
      const profileData: Record<string, ExportData> = {};

      for (const profile of profiles) {
        await ProfileService.setActiveProfile(profile.id);
        ProfileService.clearActiveProfileCache();

        const [baseExport, recurringExpenses] = await Promise.all([
          StorageService.exportData(),
          RecurringExpenseService.getRecurringExpenses(),
        ]);

        profileData[profile.id] = {
          ...baseExport,
          recurringExpenses,
          profileId: profile.id,
          profileName: profile.name,
        };
      }

      const multiProfileExport: MultiProfileExportData = {
        profiles,
        activeProfileId,
        profileData,
        exportDate: new Date().toISOString(),
        appVersion: APP_VERSION,
      };

      const fileName = `ReceiptTracker_AllProfiles_${this._formatDateForFilename()}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(multiProfileExport, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await this._shareFile(filePath, 'application/json');

      return { success: true, format: 'json', filePath };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Multi-profile JSON export error:', error);
      throw new Error(`Failed to export all profiles: ${message}`);
    } finally {
      try {
        await ProfileService.setActiveProfile(activeProfileId);
        ProfileService.clearActiveProfileCache();
      } catch (restoreError) {
        console.error('Failed to restore active profile after export:', restoreError);
      }
    }
  },

  /**
   * Export current profile JSON with option to save using file picker or share.
   */
  async exportAsJSONToDownloads(): Promise<ExportResult> {
    try {
      const [baseExport, recurringExpenses, activeProfile] = await Promise.all([
        StorageService.exportData(),
        RecurringExpenseService.getRecurringExpenses(),
        ProfileService.getActiveProfile(),
      ]);

      const exportData: ExportData = {
        ...baseExport,
        recurringExpenses,
        profileId: activeProfile.id,
        profileName: activeProfile.name,
      };

      const fileName = `ReceiptTracker_${activeProfile.name}_${this._formatDateForFilename()}.json`;
      const content = JSON.stringify(exportData, null, 2);

      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await this._shareFile(filePath, 'application/json');

      return { success: true, format: 'json', fileName };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('JSON export error:', error);
      throw new Error(`Failed to export JSON: ${message}`);
    }
  },

  /**
   * Export current profile expenses as a CSV file and open the share sheet.
   */
  async exportAsCSV(): Promise<ExportResult> {
    try {
      const [expenses, categories, activeProfile] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getCategories(),
        ProfileService.getActiveProfile(),
      ]);

      const categoryMap: Record<string, string> = {};
      categories.forEach((cat: Category) => {
        categoryMap[cat.id] = cat.name;
      });

      const headers = ['Date', 'Vendor', 'Amount', 'Category', 'Description', 'Created At', 'Profile'];
      const rows = expenses
        .sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((expense: Expense) => [
          expense.date,
          this._escapeCSV(expense.vendor),
          expense.amount.toFixed(2),
          this._escapeCSV(categoryMap[expense.category] || expense.category),
          this._escapeCSV(expense.description || expense.notes || ''),
          expense.createdAt || '',
          this._escapeCSV(activeProfile.name),
        ]);

      const csvContent = [headers.join(','), ...rows.map((row: string[]) => row.join(','))].join('\n');

      const fileName = `ReceiptTracker_${activeProfile.name}_Expenses_${this._formatDateForFilename()}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await this._shareFile(filePath, 'text/csv');

      return { success: true, format: 'csv', filePath };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('CSV export error:', error);
      throw new Error(`Failed to export CSV: ${message}`);
    }
  },

  /**
   * Export current profile CSV with option to save using file picker or share.
   */
  async exportAsCSVToDownloads(): Promise<ExportResult> {
    try {
      const [expenses, categories, activeProfile] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getCategories(),
        ProfileService.getActiveProfile(),
      ]);

      const categoryMap: Record<string, string> = {};
      categories.forEach((cat: Category) => {
        categoryMap[cat.id] = cat.name;
      });

      const headers = ['Date', 'Vendor', 'Amount', 'Category', 'Description', 'Created At', 'Profile'];
      const rows = expenses
        .sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((expense: Expense) => [
          expense.date,
          this._escapeCSV(expense.vendor),
          expense.amount.toFixed(2),
          this._escapeCSV(categoryMap[expense.category] || expense.category),
          this._escapeCSV(expense.description || expense.notes || ''),
          expense.createdAt || '',
          this._escapeCSV(activeProfile.name),
        ]);

      const csvContent = [headers.join(','), ...rows.map((row: string[]) => row.join(','))].join('\n');

      const fileName = `ReceiptTracker_${activeProfile.name}_Expenses_${this._formatDateForFilename()}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await this._shareFile(filePath, 'text/csv');

      return { success: true, format: 'csv', fileName };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('CSV export error:', error);
      throw new Error(`Failed to export CSV: ${message}`);
    }
  },

  /**
   * Check if sharing is available on the current platform.
   */
  async isSharingAvailable(): Promise<boolean> {
    return await Sharing.isAvailableAsync();
  },

  /**
   * Share a file using the native share sheet.
   */
  async _shareFile(filePath: string, mimeType: string): Promise<void> {
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
  _escapeCSV(value: string | null | undefined): string {
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
  _formatDateForFilename(): string {
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
