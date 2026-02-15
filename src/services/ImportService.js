import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageService } from './StorageService';
import RecurringExpenseService from './RecurringExpenseService';
import generateSecureId from '../utils/generateSecureId';

const ImportService = {
  /**
   * Pick and import a file (JSON, CSV, or Excel)
   */
  async pickAndImportFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      const file = result.assets[0];
      const fileExtension = this._getFileExtension(file.name);

      let importResult;
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
    } catch (error) {
      console.error('Import error:', error);
      throw new Error(`Failed to import file: ${error.message}`);
    }
  },

  /**
   * Import data from a JSON file
   */
  async _importJSON(fileUri) {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'utf8',
      });

      const data = JSON.parse(fileContent);

      // Check if it's a full backup or just expenses
      if (data.expenses || data.budgets || data.categories || data.settings) {
        // Full backup format
        const importResult = await StorageService.importData(data);

        // Import recurring expenses if present
        if (data.recurringExpenses && Array.isArray(data.recurringExpenses)) {
          try {
            await RecurringExpenseService.importRecurringExpenses(data.recurringExpenses);
          } catch (error) {
            console.warn('Failed to import recurring expenses:', error);
          }
        }

        return {
          success: true,
          format: 'json',
          warnings: importResult.warnings || [],
          message: 'Data imported successfully',
        };
      } else if (Array.isArray(data)) {
        // Array of expenses
        const validExpenses = this._validateExpensesArray(data);
        const existingExpenses = await StorageService.getExpenses();
        const mergedExpenses = this._mergeExpenses(existingExpenses, validExpenses);
        await StorageService.saveExpenses(mergedExpenses);

        return {
          success: true,
          format: 'json',
          warnings: [],
          message: `Imported ${validExpenses.length} expenses`,
        };
      } else {
        throw new Error('Invalid JSON format. Expected full backup or array of expenses.');
      }
    } catch (error) {
      console.error('JSON import error:', error);
      throw new Error(`Failed to import JSON: ${error.message}`);
    }
  },

  /**
   * Import data from a CSV file
   */
  async _importCSV(fileUri) {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'utf8',
      });

      const lines = fileContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
      }

      const headers = this._parseCSVLine(lines[0]);
      const expenses = [];
      const errors = [];

      // Get categories to map names to IDs
      const categories = await StorageService.getCategories();
      const categoryMap = {};
      categories.forEach(cat => {
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
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
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
    } catch (error) {
      console.error('CSV import error:', error);
      throw new Error(`Failed to import CSV: ${error.message}`);
    }
  },

  /**
   * Parse a CSV line handling quoted values and edge cases
   */
  _parseCSVLine(line) {
    if (!line || typeof line !== 'string') {
      return [];
    }

    const result = [];
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
  _parseCSVRow(headers, values, categoryMap) {
    const row = {};
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
   * Handles multiple date formats safely
   */
  _normalizeDate(dateStr) {
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
      console.warn(`Date parsing error: ${error.message}`);
      return new Date().toISOString().split('T')[0];
    }
  },

  /**
   * Validate an array of expenses
   */
  _validateExpensesArray(expenses) {
    return expenses.filter((expense, index) => {
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
   * Updates existing records with matching IDs, adds new ones
   */
  _mergeExpenses(existing, imported) {
    const existingMap = new Map(existing.map(e => [e.id, e]));
    
    // Update existing or add to map
    imported.forEach(expense => {
      existingMap.set(expense.id, {
        ...existingMap.get(expense.id),
        ...expense,
        updatedAt: new Date().toISOString(),
      });
    });
    
    return Array.from(existingMap.values());
  },

  /**
   * Get file extension from filename
   */
  _getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  },
};

export default ImportService;
