import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import { StorageService } from './StorageService';
import { ProfileService } from './ProfileService';
import RecurringExpenseService from './RecurringExpenseService';
import generateSecureId from '../utils/generateSecureId';
import type { Expense, ImportResult, Category, ExportData, MultiProfileExportData, Profile } from '../types';

const ImportService = {
  /**
   * Pick and import a file (JSON, CSV, or Excel)
   */
  async pickAndImportFile(): Promise<ImportResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/json',
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      const file = result.assets[0];
      const fileExtension = this._getFileExtension(file.name);

      let importResult: ImportResult;
      switch (fileExtension) {
        case 'json':
          importResult = await this._importJSON(file.uri);
          break;
        case 'csv':
          importResult = await this._importCSV(file.uri);
          break;
        case 'xlsx':
        case 'xls':
          throw new Error('Excel import is not yet supported. Please export as CSV or JSON.');
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      return importResult;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Import error:', error);
      throw new Error(`Failed to import file: ${message}`);
    }
  },

  /**
   * Import data from a JSON file (handles single profile, multi-profile, or legacy formats)
   */
  async _importJSON(fileUri: string): Promise<ImportResult> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const data = JSON.parse(fileContent);

      // Check if it's a multi-profile export
      if (data.profiles && data.profileData && data.activeProfileId) {
        return await this._importMultiProfileData(data as MultiProfileExportData);
      }

      // Check if it's a single profile export with metadata
      if ((data.expenses || data.budgets || data.categories || data.settings) && data.profileId) {
        return await this._importSingleProfileData(data as ExportData);
      }

      // Legacy format without profile metadata
      if (data.expenses || data.budgets || data.categories || data.settings) {
        return await this._importLegacyData(data);
      }

      // Array of expenses (legacy)
      if (Array.isArray(data)) {
        const validExpenses = this._validateExpensesArray(data);
        const existingExpenses = await StorageService.getExpenses();
        const mergedExpenses = this._mergeExpenses(existingExpenses, validExpenses);
        await StorageService.saveExpenses(mergedExpenses);

        return {
          success: true,
          format: 'json',
          warnings: [],
          message: `Imported ${validExpenses.length} expenses into current profile`,
        };
      }

      throw new Error('Invalid JSON format. Expected profile backup or array of expenses.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('JSON import error:', error);
      throw new Error(`Failed to import JSON: ${message}`);
    }
  },

  /**
   * Import multi-profile data
   */
  async _importMultiProfileData(data: MultiProfileExportData): Promise<ImportResult> {
    try {
      const currentProfile = await ProfileService.getActiveProfile();
      const warnings: string[] = [];
      let totalImported = 0;

      // Import or update profiles
      let existingProfiles = await ProfileService.getProfiles();
      const profileMap = new Map(existingProfiles.map(p => [p.id, p]));
      const newProfiles: Profile[] = [];

      for (const profile of data.profiles) {
        if (!profileMap.has(profile.id)) {
          // Collect new profiles
          newProfiles.push(profile);
          warnings.push(`Created new profile: ${profile.name}`);
        }
      }

      // Save all new profiles at once
      if (newProfiles.length > 0) {
        existingProfiles = [...existingProfiles, ...newProfiles];
        await ProfileService.saveProfiles(existingProfiles);
      }

      // Import data for each profile
      for (const [profileId, profileData] of Object.entries(data.profileData)) {
        await ProfileService.setActiveProfile(profileId);
        ProfileService.clearActiveProfileCache();

        const importResult = await StorageService.importData(profileData);
        
        if (profileData.recurringExpenses && Array.isArray(profileData.recurringExpenses)) {
          try {
            await RecurringExpenseService.importRecurringExpenses(profileData.recurringExpenses);
          } catch (error) {
            warnings.push(`Failed to import recurring expenses for profile ${profileData.profileName}`);
          }
        }

        if (importResult.warnings) {
          warnings.push(...importResult.warnings);
        }
        totalImported++;
      }

      // Restore original active profile
      await ProfileService.setActiveProfile(currentProfile.id);
      ProfileService.clearActiveProfileCache();

      return {
        success: true,
        format: 'json',
        warnings,
        message: `Imported data for ${totalImported} profiles`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Multi-profile import error:', error);
      throw new Error(`Failed to import multi-profile data: ${message}`);
    }
  },

  /**
   * Import single profile data with profile metadata
   */
  async _importSingleProfileData(data: ExportData): Promise<ImportResult> {
    try {
      const currentProfile = await ProfileService.getActiveProfile();
      const warnings: string[] = [];

      // Warn if importing from different profile
      if (data.profileId && data.profileId !== currentProfile.id) {
        warnings.push(
          `Importing data from profile "${data.profileName || 'Unknown'}" into current profile "${currentProfile.name}"`
        );
      }

      const importResult = await StorageService.importData(data);

      if (data.recurringExpenses && Array.isArray(data.recurringExpenses)) {
        try {
          await RecurringExpenseService.importRecurringExpenses(data.recurringExpenses);
        } catch (error) {
          warnings.push('Failed to import recurring expenses');
        }
      }

      if (importResult.warnings) {
        warnings.push(...importResult.warnings);
      }

      return {
        success: true,
        format: 'json',
        warnings,
        message: `Data imported into profile "${currentProfile.name}"`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Single profile import error:', error);
      throw new Error(`Failed to import profile data: ${message}`);
    }
  },

  /**
   * Import legacy data without profile metadata
   */
  async _importLegacyData(data: Partial<ExportData>): Promise<ImportResult> {
    try {
      const currentProfile = await ProfileService.getActiveProfile();
      const warnings: string[] = [
        'Importing legacy data format (no profile information). Data will be merged into current profile.',
      ];

      const importResult = await StorageService.importData(data);

      if (data.recurringExpenses && Array.isArray(data.recurringExpenses)) {
        try {
          await RecurringExpenseService.importRecurringExpenses(data.recurringExpenses);
        } catch (error) {
          warnings.push('Failed to import recurring expenses');
        }
      }

      if (importResult.warnings) {
        warnings.push(...importResult.warnings);
      }

      return {
        success: true,
        format: 'json',
        warnings,
        message: `Legacy data imported into profile "${currentProfile.name}"`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Legacy import error:', error);
      throw new Error(`Failed to import legacy data: ${message}`);
    }
  },

  /**
   * Import data from a CSV file
   */
  async _importCSV(fileUri: string): Promise<ImportResult> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const lines = fileContent.split('\n').filter((line: string) => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
      }

      const headers = this._parseCSVLine(lines[0]);
      const expenses: Expense[] = [];
      const errors: string[] = [];

      // Get categories to map names to IDs
      const categories: Category[] = await StorageService.getCategories();
      const categoryMap: Record<string, string> = {};
      categories.forEach((cat) => {
        categoryMap[cat.name.toLowerCase()] = cat.id;
      });

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = this._parseCSVLine(lines[i]);
          if (values.length === 0) continue;

          const expense = this._parseCSVRow(headers, values, categoryMap);
          if (expense) {
            expenses.push(expense);
          }
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Row ${i + 1}: ${errMsg}`);
        }
      }

      if (expenses.length === 0) {
        throw new Error('No valid expenses found in CSV file');
      }

      const existingExpenses = await StorageService.getExpenses();
      const mergedExpenses = this._mergeExpenses(existingExpenses, expenses);
      await StorageService.saveExpenses(mergedExpenses);

      return {
        success: true,
        format: 'csv',
        warnings: errors,
        message: `Imported ${expenses.length} expenses${errors.length > 0 ? ` (${errors.length} rows skipped)` : ''}`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('CSV import error:', error);
      throw new Error(`Failed to import CSV: ${message}`);
    }
  },

  /**
   * Parse a CSV line handling quoted values and edge cases
   */
  _parseCSVLine(line: string): string[] {
    if (!line || typeof line !== 'string') {
      return [];
    }

    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = i + 1 < line.length ? line[i + 1] : null;

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote within quotes
          current += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator outside quotes
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add final field
    result.push(current.trim());
    return result;
  },

  /**
   * Parse a CSV row into an expense object
   */
  _parseCSVRow(headers: string[], values: string[], categoryMap: Record<string, string>): Expense | null {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.toLowerCase().trim()] = values[index] || '';
    });

    // Map common CSV column names
    const date = row.date || row.transaction_date || row.purchase_date;
    const vendor = row.vendor || row.merchant || row.description || row.name;
    const amount = row.amount || row.total || row.price;
    const category = row.category || row.type;
    const description = row.description || row.notes || row.memo || '';

    if (!date || !vendor || !amount) {
      throw new Error('Missing required fields (date, vendor, amount)');
    }

    const parsedAmount = parseFloat(amount.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // Map category name to ID
    let categoryId = '8'; // Default to "Other"
    if (category) {
      const categoryLower = category.toLowerCase().trim();
      categoryId = categoryMap[categoryLower] || '8';
    }

    return {
      id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vendor: vendor.trim(),
      amount: parsedAmount,
      category: categoryId,
      date: this._normalizeDate(date),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Normalize date to ISO format (YYYY-MM-DD)
   */
  _normalizeDate(dateStr: string): string {
    try {
      if (!dateStr || typeof dateStr !== 'string') {
        return new Date().toISOString().split('T')[0];
      }

      // Try ISO format first (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = new Date(dateStr + 'T00:00:00');
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }

      // Try parsing as-is
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      // Fallback to today
      console.warn(`Invalid date format: ${dateStr}, using today's date`);
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.warn(`Date parsing error:`, error);
      return new Date().toISOString().split('T')[0];
    }
  },

  /**
   * Validate an array of expenses
   */
  _validateExpensesArray(expenses: Partial<Expense>[]): Expense[] {
    return expenses.filter((expense, index): expense is Expense => {
      try {
        if (!expense.vendor || !expense.amount || !expense.category || !expense.date) {
          console.warn(`Expense[${index}]: Missing required fields`);
          return false;
        }
        return true;
      } catch {
        return false;
      }
    });
  },

  /**
   * Merge imported expenses with existing ones
   */
  _mergeExpenses(existing: Expense[], imported: Expense[]): Expense[] {
    const existingMap = new Map(existing.map((e) => [e.id, e]));

    // Update existing or add to map
    imported.forEach((expense) => {
      existingMap.set(expense.id, {
        ...existingMap.get(expense.id),
        ...expense,
        updatedAt: new Date().toISOString(),
      } as Expense);
    });

    return Array.from(existingMap.values());
  },

  /**
   * Get file extension from filename
   */
  _getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  },
};

export default ImportService;
