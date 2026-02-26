import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import getDefaultPresetBudgets from '../utils/PresetBudgets';
import generateSecureId from '../utils/generateSecureId';
import { ProfileService } from './ProfileService';
import { APP_VERSION } from '../config/version';
import type {
  Expense,
  Budget,
  BudgetData,
  Category,
  NewCategoryData,
  AppSettings,
  ExportData,
} from '../types';

// ─── Storage Keys ────────────────────────────────────────

const BASE_STORAGE_KEYS = {
  EXPENSES: '@receipt_tracker_expenses',
  BUDGETS: '@receipt_tracker_budgets',
  CATEGORIES: '@receipt_tracker_categories',
  SETTINGS: '@receipt_tracker_settings',
  ENCRYPTION_KEY: '@receipt_tracker_encryption_key',
} as const;

const getStorageKey = async (baseKey: string): Promise<string> => {
  const profileId = await ProfileService.getActiveProfileId();
  return `${baseKey}_${profileId}`;
};

// ─── Encryption Utilities ────────────────────────────────

const generateEncryptionKey = async (): Promise<string | null> => {
  try {
    const existingKey = await SecureStore.getItemAsync(BASE_STORAGE_KEYS.ENCRYPTION_KEY);
    if (existingKey) return existingKey;

    const key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Math.random().toString(36) + Date.now().toString()
    );

    await SecureStore.setItemAsync(BASE_STORAGE_KEYS.ENCRYPTION_KEY, key);
    return key;
  } catch (error) {
    console.warn('Failed to generate encryption key, falling back to plain text');
    return null;
  }
};

const encryptData = async (data: unknown, key: string | null): Promise<string> => {
  if (!key) return JSON.stringify(data);
  try {
    const jsonData = JSON.stringify(data);
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      jsonData + key
    );
    return encrypted;
  } catch (error) {
    console.warn('Encryption failed, falling back to plain text');
    return JSON.stringify(data);
  }
};

const decryptData = async <T>(encryptedData: string, _key: string | null, fallbackData: T): Promise<T> => {
  try {
    return JSON.parse(encryptedData) as T;
  } catch (error) {
    console.warn('Decryption failed, using fallback data');
    return fallbackData;
  }
};

// ─── Validators ───────────────────────────────────────────

const validateExpenseData = (expense: Partial<Expense>): boolean => {
  if (!expense || typeof expense !== 'object') {
    throw new Error('Invalid expense data: must be an object');
  }

  if (!expense.vendor || typeof expense.vendor !== 'string' || expense.vendor.trim() === '') {
    throw new Error('Invalid expense data: vendor is required and must be a non-empty string');
  }

  if (!expense.amount || typeof expense.amount !== 'number' || expense.amount <= 0) {
    throw new Error('Invalid expense data: amount is required and must be a positive number');
  }

  if (!expense.category || typeof expense.category !== 'string') {
    throw new Error('Invalid expense data: category is required and must be a string');
  }

  if (!expense.date || typeof expense.date !== 'string') {
    throw new Error('Invalid expense data: date is required and must be a string');
  }

  return true;
};

const validateBudgetData = (budget: Partial<Budget> | BudgetData): boolean => {
  if (!budget || typeof budget !== 'object') {
    throw new Error('Invalid budget data: must be an object');
  }

  if (!budget.name || typeof budget.name !== 'string' || budget.name.trim() === '') {
    throw new Error('Invalid budget data: name is required and must be a non-empty string');
  }

  if (!budget.amount || typeof budget.amount !== 'number' || budget.amount <= 0) {
    throw new Error('Invalid budget data: amount is required and must be a positive number');
  }

  if (!budget.period || !['weekly', 'monthly', 'yearly'].includes(budget.period)) {
    throw new Error('Invalid budget data: period must be weekly, monthly, or yearly');
  }

  return true;
};

// ─── Import Data Shapes ──────────────────────────────────

interface ImportDataInput {
  expenses?: Partial<Expense>[];
  budgets?: Partial<Budget>[];
  categories?: Partial<Category>[];
  settings?: Partial<AppSettings>;
}

interface ImportResult {
  success: boolean;
  warnings: string[];
}

// ─── Storage Service ─────────────────────────────────────

export const StorageService = {
  // ───── Expenses ─────────────────────────────────────────

  async getExpenses(): Promise<Expense[]> {
    try {
      const key = await getStorageKey(BASE_STORAGE_KEYS.EXPENSES);
      const expenses = await AsyncStorage.getItem(key);
      if (!expenses) return [];

      const parsedExpenses: Expense[] = JSON.parse(expenses);
      if (!Array.isArray(parsedExpenses)) {
        throw new Error('Invalid expenses data: expected array');
      }

      return parsedExpenses.filter((expense) => {
        try {
          validateExpenseData(expense);
          return true;
        } catch {
          console.warn('Invalid expense found and filtered:', expense);
          return false;
        }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error getting expenses:', error);
      throw new Error(`Failed to load expenses: ${message}`);
    }
  },

  async saveExpenses(expenses: Expense[]): Promise<void> {
    try {
      if (!Array.isArray(expenses)) {
        throw new Error('Expenses must be an array');
      }

      // Validate all expenses before saving
      expenses.forEach(validateExpenseData);

      const key = await getStorageKey(BASE_STORAGE_KEYS.EXPENSES);
      await AsyncStorage.setItem(key, JSON.stringify(expenses));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error saving expenses:', error);
      throw new Error(`Failed to save expenses: ${message}`);
    }
  },

  async addExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    try {
      validateExpenseData(expense as Partial<Expense>);

      const expenses = await this.getExpenses();
      const newExpense: Expense = {
        ...expense,
        id: await generateSecureId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.saveExpenses([...expenses, newExpense]);
      return newExpense;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error adding expense:', error);
      throw new Error(`Failed to add expense: ${message}`);
    }
  },

  async updateExpense(expenseId: string, updates: Partial<Expense>): Promise<Expense> {
    try {
      if (!expenseId || typeof expenseId !== 'string') {
        throw new Error('Expense ID is required and must be a string');
      }

      const expenses = await this.getExpenses();
      const expenseIndex = expenses.findIndex((expense) => expense.id === expenseId);

      if (expenseIndex === -1) {
        throw new Error('Expense not found');
      }

      const updatedExpense: Expense = {
        ...expenses[expenseIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      validateExpenseData(updatedExpense);

      const updatedExpenses = [...expenses];
      updatedExpenses[expenseIndex] = updatedExpense;

      await this.saveExpenses(updatedExpenses);
      return updatedExpense;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error updating expense:', error);
      throw new Error(`Failed to update expense: ${message}`);
    }
  },

  async deleteExpense(expenseId: string): Promise<void> {
    try {
      if (!expenseId || typeof expenseId !== 'string') {
        throw new Error('Expense ID is required and must be a string');
      }

      const expenses = await this.getExpenses();
      const filteredExpenses = expenses.filter((expense) => expense.id !== expenseId);

      if (filteredExpenses.length === expenses.length) {
        throw new Error('Expense not found');
      }

      await this.saveExpenses(filteredExpenses);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error deleting expense:', error);
      throw new Error(`Failed to delete expense: ${message}`);
    }
  },

  // ───── Budgets ──────────────────────────────────────────

  async getBudgets(): Promise<Budget[]> {
    try {
      const key = await getStorageKey(BASE_STORAGE_KEYS.BUDGETS);
      const budgets = await AsyncStorage.getItem(key);
      if (!budgets) return [];

      const parsedBudgets: Budget[] = JSON.parse(budgets);
      if (!Array.isArray(parsedBudgets)) {
        throw new Error('Invalid budgets data: expected array');
      }

      return parsedBudgets.filter((budget) => {
        try {
          validateBudgetData(budget);
          return true;
        } catch {
          console.warn('Invalid budget found and filtered:', budget);
          return false;
        }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error getting budgets:', error);
      throw new Error(`Failed to load budgets: ${message}`);
    }
  },

  async saveBudgets(budgets: Budget[]): Promise<void> {
    try {
      if (!Array.isArray(budgets)) {
        throw new Error('Budgets must be an array');
      }

      budgets.forEach(validateBudgetData);
      const key = await getStorageKey(BASE_STORAGE_KEYS.BUDGETS);
      await AsyncStorage.setItem(key, JSON.stringify(budgets));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error saving budgets:', error);
      throw new Error(`Failed to save budgets: ${message}`);
    }
  },

  async addBudget(budget: BudgetData): Promise<Budget> {
    try {
      validateBudgetData(budget);

      const budgets = await this.getBudgets();
      const newBudget: Budget = {
        ...budget,
        id: await generateSecureId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.saveBudgets([...budgets, newBudget]);
      return newBudget;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error adding budget:', error);
      throw new Error(`Failed to add budget: ${message}`);
    }
  },

  async updateBudget(budgetId: string, updates: Partial<Budget>): Promise<Budget> {
    try {
      if (!budgetId || typeof budgetId !== 'string') {
        throw new Error('Budget ID is required and must be a string');
      }

      const budgets = await this.getBudgets();
      const budgetIndex = budgets.findIndex((budget) => budget.id === budgetId);

      if (budgetIndex === -1) {
        throw new Error('Budget not found');
      }

      const updatedBudget: Budget = {
        ...budgets[budgetIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      validateBudgetData(updatedBudget);

      const updatedBudgets = [...budgets];
      updatedBudgets[budgetIndex] = updatedBudget;

      await this.saveBudgets(updatedBudgets);
      return updatedBudget;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error updating budget:', error);
      throw new Error(`Failed to update budget: ${message}`);
    }
  },

  async deleteBudget(budgetId: string): Promise<void> {
    try {
      if (!budgetId || typeof budgetId !== 'string') {
        throw new Error('Budget ID is required and must be a string');
      }

      const budgets = await this.getBudgets();
      const filteredBudgets = budgets.filter((budget) => budget.id !== budgetId);

      if (filteredBudgets.length === budgets.length) {
        throw new Error('Budget not found');
      }

      await this.saveBudgets(filteredBudgets);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error deleting budget:', error);
      throw new Error(`Failed to delete budget: ${message}`);
    }
  },

  getDefaultPresetBudgets() {
    return getDefaultPresetBudgets();
  },

  async addPresetBudget(categoryId: string): Promise<Budget> {
    try {
      const presets = getDefaultPresetBudgets();
      const presetBudget = presets.find((b) => b.categoryId === categoryId);

      if (!presetBudget) {
        throw new Error('No preset budget found for this category');
      }

      const budgets = await this.getBudgets();
      const budgetExists = budgets.some((b) => b.categoryId === categoryId);

      if (budgetExists) {
        throw new Error('Budget already exists for this category');
      }

      const newBudget: Budget = {
        ...presetBudget,
        id: await generateSecureId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.saveBudgets([...budgets, newBudget]);
      return newBudget;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error adding preset budget:', error);
      throw new Error(`Failed to add preset budget: ${message}`);
    }
  },

  async getAvailablePresetBudgets() {
    try {
      const budgets = await this.getBudgets();
      const presets = getDefaultPresetBudgets();

      return presets.filter(
        (preset) => !budgets.some((budget) => budget.categoryId === preset.categoryId)
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error getting available preset budgets:', error);
      throw new Error(`Failed to get available preset budgets: ${message}`);
    }
  },

  // ───── Categories ───────────────────────────────────────

  async getCategories(): Promise<Category[]> {
    try {
      const key = await getStorageKey(BASE_STORAGE_KEYS.CATEGORIES);
      const categories = await AsyncStorage.getItem(key);
      return categories ? JSON.parse(categories) : this.getDefaultCategories();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error getting categories:', error);
      throw new Error(`Failed to load categories: ${message}`);
    }
  },

  async saveCategories(categories: Category[]): Promise<void> {
    try {
      if (!Array.isArray(categories)) {
        throw new Error('Categories must be an array');
      }

      const key = await getStorageKey(BASE_STORAGE_KEYS.CATEGORIES);
      await AsyncStorage.setItem(key, JSON.stringify(categories));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error saving categories:', error);
      throw new Error(`Failed to save categories: ${message}`);
    }
  },

  getDefaultCategories(): Category[] {
    return [
      { id: '1', name: 'Food & Dining', icon: 'restaurant', color: '#ef4444' },
      { id: '2', name: 'Transportation', icon: 'directions-car', color: '#3b82f6' },
      { id: '3', name: 'Shopping', icon: 'shopping-bag', color: '#8b5cf6' },
      { id: '4', name: 'Entertainment', icon: 'movie', color: '#ec4899' },
      { id: '5', name: 'Bills & Utilities', icon: 'receipt', color: '#f59e0b' },
      { id: '6', name: 'Healthcare', icon: 'local-hospital', color: '#10b981' },
      { id: '7', name: 'Education', icon: 'school', color: '#06b6d4' },
      { id: '8', name: 'Other', icon: 'more-horiz', color: '#6b7280' },
    ];
  },

  async addCategory(category: NewCategoryData): Promise<Category> {
    try {
      if (!category.name || !category.name.trim()) {
        throw new Error('Category name is required');
      }

      const trimmedName = category.name.trim();

      // Validate name length
      if (trimmedName.length > 50) {
        throw new Error('Category name must be 50 characters or less');
      }

      const categories = await this.getCategories();

      // Check for duplicate names (case-insensitive)
      const duplicateExists = categories.some(
        (cat) => cat.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicateExists) {
        throw new Error('A category with this name already exists');
      }

      // Validate color format (hex color)
      const color = category.color || '#6366f1';
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new Error('Invalid color format. Must be hex color (e.g., #6366f1)');
      }

      // Validate icon (basic check)
      const icon = category.icon || 'label';
      if (typeof icon !== 'string' || icon.length === 0) {
        throw new Error('Invalid icon value');
      }

      const newCategory: Category = {
        ...category,
        id: await generateSecureId(),
        name: trimmedName,
        icon,
        color,
      };

      categories.push(newCategory);
      await this.saveCategories(categories);
      return newCategory;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error adding category:', error);
      throw new Error(`Failed to add category: ${message}`);
    }
  },

  async getAllCategories(): Promise<Category[]> {
    try {
      const [categories, budgets] = await Promise.all([
        this.getCategories(),
        this.getBudgets(),
      ]);

      const categoryIds = new Set(categories.map((c) => c.id));
      const budgetCategories: Category[] = budgets
        .filter((b) => b.categoryId && !categoryIds.has(b.categoryId))
        .map((b) => ({
          id: b.categoryId!,
          name: b.name,
          icon: 'label',
          color: '#6366f1',
        }));

      // Deduplicate budget categories by id
      const uniqueBudgetCategories = budgetCategories.filter(
        (cat, index, self) => self.findIndex((c) => c.id === cat.id) === index
      );

      return [...categories, ...uniqueBudgetCategories];
    } catch (error) {
      console.error('Error getting all categories:', error);
      return this.getDefaultCategories();
    }
  },

  // ───── Settings ─────────────────────────────────────────

  async getSettings(): Promise<AppSettings> {
    try {
      const key = await getStorageKey(BASE_STORAGE_KEYS.SETTINGS);
      const settings = await AsyncStorage.getItem(key);
      return settings ? JSON.parse(settings) : this.getDefaultSettings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error getting settings:', error);
      throw new Error(`Failed to load settings: ${message}`);
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      if (!settings || typeof settings !== 'object') {
        throw new Error('Settings must be an object');
      }

      const key = await getStorageKey(BASE_STORAGE_KEYS.SETTINGS);
      await AsyncStorage.setItem(key, JSON.stringify(settings));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error saving settings:', error);
      throw new Error(`Failed to save settings: ${message}`);
    }
  },

  getDefaultSettings(): AppSettings {
    return {
      monthlyBudget: 10000,
      currency: 'USD',
      notifications: true,
      darkMode: false,
      biometricAuth: false,
      autoBackup: false,
      passcodeLock: false,
      autoDetectCurrency: true,
      locationDetectionAttempted: false,
      detectedCountryCode: '',
    };
  },

  // ───── Security Utilities ───────────────────────────────

  async clearAllData(): Promise<void> {
    try {
      const profileId = await ProfileService.getActiveProfileId();
      await Promise.all([
        AsyncStorage.removeItem(`${BASE_STORAGE_KEYS.EXPENSES}_${profileId}`),
        AsyncStorage.removeItem(`${BASE_STORAGE_KEYS.BUDGETS}_${profileId}`),
        AsyncStorage.removeItem(`${BASE_STORAGE_KEYS.CATEGORIES}_${profileId}`),
        AsyncStorage.removeItem(`${BASE_STORAGE_KEYS.SETTINGS}_${profileId}`),
        SecureStore.deleteItemAsync(BASE_STORAGE_KEYS.ENCRYPTION_KEY),
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error clearing all data:', error);
      throw new Error(`Failed to clear all data: ${message}`);
    }
  },

  async exportData(): Promise<ExportData> {
    try {
      const [expenses, budgets, categories, settings] = await Promise.all([
        this.getExpenses(),
        this.getBudgets(),
        this.getCategories(),
        this.getSettings(),
      ]);

      return {
        expenses,
        budgets,
        categories,
        settings,
        exportDate: new Date().toISOString(),
        appVersion: APP_VERSION,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error exporting data:', error);
      throw new Error(`Failed to export data: ${message}`);
    }
  },

  async importData(data: ImportDataInput): Promise<ImportResult> {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid import data');
      }

      const { expenses, budgets, categories, settings } = data;
      const importErrors: string[] = [];

      // Validate and MERGE expenses individually
      if (expenses && Array.isArray(expenses)) {
        const validExpenses = expenses.filter((expense, index) => {
          try {
            validateExpenseData(expense);
            if (typeof expense.id !== 'string' || expense.id.trim() === '') {
              throw new Error('Missing or invalid id');
            }
            return true;
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            importErrors.push(`Expense[${index}]: ${errMsg}`);
            return false;
          }
        }) as Expense[];

        // Merge with existing expenses
        const existingExpenses = await this.getExpenses();
        const existingMap = new Map(existingExpenses.map((e) => [e.id, e]));

        validExpenses.forEach((expense) => {
          existingMap.set(expense.id, {
            ...expense,
            updatedAt: new Date().toISOString(),
          });
        });

        await this.saveExpenses(Array.from(existingMap.values()));
      }

      // Validate and MERGE budgets individually
      if (budgets && Array.isArray(budgets)) {
        const validBudgets = budgets.filter((budget, index) => {
          try {
            validateBudgetData(budget as BudgetData);
            if (typeof budget.id !== 'string' || budget.id.trim() === '') {
              throw new Error('Missing or invalid id');
            }
            return true;
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            importErrors.push(`Budget[${index}]: ${errMsg}`);
            return false;
          }
        }) as Budget[];

        // Merge with existing budgets
        const existingBudgets = await this.getBudgets();
        const existingMap = new Map(existingBudgets.map((b) => [b.id, b]));

        validBudgets.forEach((budget) => {
          existingMap.set(budget.id, {
            ...budget,
            updatedAt: new Date().toISOString(),
          });
        });

        await this.saveBudgets(Array.from(existingMap.values()));
      }

      // Validate and MERGE categories structure
      if (categories && Array.isArray(categories)) {
        const validCategories = categories.filter((cat, index) => {
          if (!cat || typeof cat !== 'object') {
            importErrors.push(`Category[${index}]: must be an object`);
            return false;
          }
          if (!cat.id || typeof cat.id !== 'string') {
            importErrors.push(`Category[${index}]: missing or invalid id`);
            return false;
          }
          if (!cat.name || typeof cat.name !== 'string' || cat.name.trim() === '') {
            importErrors.push(`Category[${index}]: missing or invalid name`);
            return false;
          }
          return true;
        }) as Category[];

        // Merge with existing categories
        const existingCategories = await this.getCategories();
        const existingMap = new Map(existingCategories.map((c) => [c.id, c]));

        validCategories.forEach((category) => {
          existingMap.set(category.id, category);
        });

        await this.saveCategories(Array.from(existingMap.values()));
      }

      // Validate and MERGE settings structure with allowed keys only
      if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
        const allowedKeys: (keyof AppSettings)[] = [
          'monthlyBudget', 'currency', 'notifications',
          'darkMode', 'biometricAuth', 'autoBackup', 'passcodeLock',
          'autoDetectCurrency', 'locationDetectionAttempted', 'detectedCountryCode',
        ];

        // Get existing settings to merge with
        const existingSettings = await this.getSettings();
        const sanitizedSettings: AppSettings = { ...existingSettings };
        const defaults = this.getDefaultSettings();

        for (const key of allowedKeys) {
          if (key in settings) {
            const value = settings[key];
            const expectedType = typeof defaults[key];
            if (typeof value === expectedType) {
              (sanitizedSettings as Record<string, unknown>)[key] = value;
            } else {
              importErrors.push(`Settings.${key}: expected ${expectedType}, got ${typeof value}`);
            }
          }
        }
        await this.saveSettings(sanitizedSettings);
      }

      if (importErrors.length > 0) {
        console.warn('Import completed with validation warnings:', importErrors);
      }

      return { success: true, warnings: importErrors };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error importing data:', error);
      throw new Error(`Failed to import data: ${message}`);
    }
  },
};
