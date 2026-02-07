import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  EXPENSES: '@receipt_tracker_expenses',
  BUDGETS: '@receipt_tracker_budgets',
  CATEGORIES: '@receipt_tracker_categories',
  SETTINGS: '@receipt_tracker_settings',
  ENCRYPTION_KEY: '@receipt_tracker_encryption_key',
};

// Encryption utilities
const generateEncryptionKey = async () => {
  try {
    const existingKey = await SecureStore.getItemAsync(STORAGE_KEYS.ENCRYPTION_KEY);
    if (existingKey) return existingKey;
    
    const key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Math.random().toString(36) + Date.now().toString()
    );
    
    await SecureStore.setItemAsync(STORAGE_KEYS.ENCRYPTION_KEY, key);
    return key;
  } catch (error) {
    console.warn('Failed to generate encryption key, falling back to plain text');
    return null;
  }
};

const encryptData = async (data, key) => {
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

const decryptData = async (encryptedData, key, fallbackData) => {
  if (!key) {
    try {
      return JSON.parse(encryptedData);
    } catch {
      return fallbackData;
    }
  }
  try {
    // For this implementation, we'll use a simple approach
    // In production, consider using a proper encryption library
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
    return data ? JSON.parse(data) : fallbackData;
  } catch (error) {
    console.warn('Decryption failed, using fallback data');
    return fallbackData;
  }
};

const validateExpenseData = (expense) => {
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

const validateBudgetData = (budget) => {
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

export const StorageService = {
  // Expenses
  async getExpenses() {
    try {
      const expenses = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (!expenses) return [];
      
      const parsedExpenses = JSON.parse(expenses);
      if (!Array.isArray(parsedExpenses)) {
        throw new Error('Invalid expenses data: expected array');
      }
      
      return parsedExpenses.filter(expense => {
        try {
          validateExpenseData(expense);
          return true;
        } catch {
          console.warn('Invalid expense found and filtered:', expense);
          return false;
        }
      });
    } catch (error) {
      console.error('Error getting expenses:', error);
      throw new Error(`Failed to load expenses: ${error.message}`);
    }
  },

  async saveExpenses(expenses) {
    try {
      if (!Array.isArray(expenses)) {
        throw new Error('Expenses must be an array');
      }
      
      // Validate all expenses before saving
      expenses.forEach(validateExpenseData);
      
      await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error saving expenses:', error);
      throw new Error(`Failed to save expenses: ${error.message}`);
    }
  },

  async addExpense(expense) {
    try {
      validateExpenseData(expense);
      
      const expenses = await this.getExpenses();
      const newExpense = {
        ...expense,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await this.saveExpenses([...expenses, newExpense]);
      return newExpense;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw new Error(`Failed to add expense: ${error.message}`);
    }
  },

  async updateExpense(expenseId, updates) {
    try {
      if (!expenseId || typeof expenseId !== 'string') {
        throw new Error('Expense ID is required and must be a string');
      }
      
      const expenses = await this.getExpenses();
      const expenseIndex = expenses.findIndex(expense => expense.id === expenseId);
      
      if (expenseIndex === -1) {
        throw new Error('Expense not found');
      }
      
      const updatedExpense = { ...expenses[expenseIndex], ...updates, updatedAt: new Date().toISOString() };
      validateExpenseData(updatedExpense);
      
      const updatedExpenses = [...expenses];
      updatedExpenses[expenseIndex] = updatedExpense;
      
      await this.saveExpenses(updatedExpenses);
      return updatedExpense;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw new Error(`Failed to update expense: ${error.message}`);
    }
  },

  async deleteExpense(expenseId) {
    try {
      if (!expenseId || typeof expenseId !== 'string') {
        throw new Error('Expense ID is required and must be a string');
      }
      
      const expenses = await this.getExpenses();
      const filteredExpenses = expenses.filter(expense => expense.id !== expenseId);
      
      if (filteredExpenses.length === expenses.length) {
        throw new Error('Expense not found');
      }
      
      await this.saveExpenses(filteredExpenses);
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw new Error(`Failed to delete expense: ${error.message}`);
    }
  },

  // Budgets
  async getBudgets() {
    try {
      const budgets = await AsyncStorage.getItem(STORAGE_KEYS.BUDGETS);
      if (!budgets) return [];
      
      const parsedBudgets = JSON.parse(budgets);
      if (!Array.isArray(parsedBudgets)) {
        throw new Error('Invalid budgets data: expected array');
      }
      
      return parsedBudgets.filter(budget => {
        try {
          validateBudgetData(budget);
          return true;
        } catch {
          console.warn('Invalid budget found and filtered:', budget);
          return false;
        }
      });
    } catch (error) {
      console.error('Error getting budgets:', error);
      throw new Error(`Failed to load budgets: ${error.message}`);
    }
  },

  async saveBudgets(budgets) {
    try {
      if (!Array.isArray(budgets)) {
        throw new Error('Budgets must be an array');
      }
      
      budgets.forEach(validateBudgetData);
      await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    } catch (error) {
      console.error('Error saving budgets:', error);
      throw new Error(`Failed to save budgets: ${error.message}`);
    }
  },

  async addBudget(budget) {
    try {
      validateBudgetData(budget);
      
      const budgets = await this.getBudgets();
      const newBudget = {
        ...budget,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await this.saveBudgets([...budgets, newBudget]);
      return newBudget;
    } catch (error) {
      console.error('Error adding budget:', error);
      throw new Error(`Failed to add budget: ${error.message}`);
    }
  },

  async deleteBudget(budgetId) {
    try {
      if (!budgetId || typeof budgetId !== 'string') {
        throw new Error('Budget ID is required and must be a string');
      }
      
      const budgets = await this.getBudgets();
      const filteredBudgets = budgets.filter(budget => budget.id !== budgetId);
      
      if (filteredBudgets.length === budgets.length) {
        throw new Error('Budget not found');
      }
      
      await this.saveBudgets(filteredBudgets);
    } catch (error) {
      console.error('Error deleting budget:', error);
      throw new Error(`Failed to delete budget: ${error.message}`);
    }
  },

  // Categories
  async getCategories() {
    try {
      const categories = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return categories ? JSON.parse(categories) : this.getDefaultCategories();
    } catch (error) {
      console.error('Error getting categories:', error);
      throw new Error(`Failed to load categories: ${error.message}`);
    }
  },

  async saveCategories(categories) {
    try {
      if (!Array.isArray(categories)) {
        throw new Error('Categories must be an array');
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (error) {
      console.error('Error saving categories:', error);
      throw new Error(`Failed to save categories: ${error.message}`);
    }
  },

  getDefaultCategories() {
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

  // Settings
  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return settings ? JSON.parse(settings) : this.getDefaultSettings();
    } catch (error) {
      console.error('Error getting settings:', error);
      throw new Error(`Failed to load settings: ${error.message}`);
    }
  },

  async saveSettings(settings) {
    try {
      if (!settings || typeof settings !== 'object') {
        throw new Error('Settings must be an object');
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error(`Failed to save settings: ${error.message}`);
    }
  },

  getDefaultSettings() {
    return {
      monthlyBudget: 1550,
      currency: 'USD',
      notifications: true,
      darkMode: false,
      biometricAuth: false,
      autoBackup: false,
      passcodeLock: false,
    };
  },

  // Security utilities
  async clearAllData() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.EXPENSES),
        AsyncStorage.removeItem(STORAGE_KEYS.BUDGETS),
        AsyncStorage.removeItem(STORAGE_KEYS.CATEGORIES),
        AsyncStorage.removeItem(STORAGE_KEYS.SETTINGS),
        SecureStore.deleteItemAsync(STORAGE_KEYS.ENCRYPTION_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw new Error(`Failed to clear all data: ${error.message}`);
    }
  },

  async exportData() {
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
        version: '1.0.0',
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error(`Failed to export data: ${error.message}`);
    }
  },

  async importData(data) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid import data');
      }
      
      const { expenses, budgets, categories, settings } = data;
      
      if (expenses && Array.isArray(expenses)) {
        await this.saveExpenses(expenses);
      }
      
      if (budgets && Array.isArray(budgets)) {
        await this.saveBudgets(budgets);
      }
      
      if (categories && Array.isArray(categories)) {
        await this.saveCategories(categories);
      }
      
      if (settings && typeof settings === 'object') {
        await this.saveSettings(settings);
      }
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error(`Failed to import data: ${error.message}`);
    }
  },
};
