/**
 * Shared TypeScript type definitions for ReceiptTracker.
 *
 * These interfaces mirror the data shapes used across services,
 * storage, and UI components.
 */

// ─── Expense ──────────────────────────────────────────────

export interface Expense {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  date: string; // ISO date string YYYY-MM-DD
  description?: string;
  notes?: string;
  receiptImage?: string;
  isRecurring?: boolean;
  frequency?: Frequency | null;
  createdAt?: string;
  updatedAt?: string;
}

export type Frequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

// ─── Budget ───────────────────────────────────────────────

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

export interface Budget {
  id: string;
  name: string;
  amount: number;
  period: BudgetPeriod;
  categoryId?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetData {
  name: string;
  amount: number;
  period: BudgetPeriod;
  categoryId?: string;
}

// ─── Category ─────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

export interface NewCategoryData {
  name: string;
  icon: string;
  color: string;
}

// ─── Settings ─────────────────────────────────────────────

export interface AppSettings {
  monthlyBudget?: number;
  currency?: string;
  notifications?: boolean;
  biometricAuth?: boolean;
  darkMode?: boolean;
  autoDetectCurrency?: boolean;
  [key: string]: unknown;
}

// ─── Recurring Expense ────────────────────────────────────

export interface RecurringExpense {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  frequency: Frequency;
  startDate: string;
  nextDueDate?: string;
  lastProcessed?: string;
  enabled?: boolean;
  description?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecurringExpenseData {
  vendor: string;
  amount: number;
  category: string;
  frequency: Frequency;
  startDate: string;
  description?: string;
  notes?: string;
}

// ─── Currency ─────────────────────────────────────────────

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rate?: number;
}

// ─── Theme / Colors ───────────────────────────────────────

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryLighter: string;
  primaryLightest: string;
  primaryDark: string;
  accent: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  background: string;
  backgroundSecondary: string;
  white: string;
  black: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  divider: string;
  overlay: string;
  shadow: string;
  [key: string]: string;
}

// ─── OCR / Gemini ─────────────────────────────────────────

export interface ReceiptItem {
  name: string;
  price: number | null;
  quantity: number;
}

export interface ExtractedReceiptData {
  vendor: string;
  amount: number | null;
  date: string;
  currency?: string;
  items: ReceiptItem[];
  description?: string;
  category?: string;
  tax?: number | null;
  subtotal?: number | null;
  paymentMethod?: string;
  confidence?: number;
  source?: 'gemini_ai' | 'google_vision' | 'pattern_matching';
}

export interface ExtractionQuality {
  status: 'good' | 'warning' | 'poor' | 'error';
  message: string;
}

// ─── Storage / Export / Import ─────────────────────────────

export interface ExportData {
  expenses: Expense[];
  budgets: Budget[];
  categories: Category[];
  settings: AppSettings;
  recurringExpenses?: RecurringExpense[];
  exportDate: string;
  appVersion: string;
}

export interface ImportResult {
  success: boolean;
  format?: 'json' | 'csv';
  warnings?: string[];
  message?: string;
  canceled?: boolean;
}

export interface ExportResult {
  success: boolean;
  format: 'json' | 'csv';
  filePath?: string;
  fileName?: string;
}

// ─── Notification ─────────────────────────────────────────

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type?: string;
}

// ─── Navigation ───────────────────────────────────────────

export type RootStackParamList = {
  MainTabs: undefined;
  RecurringExpenses: undefined;
  SecuritySettings: undefined;
  CurrencySettings: undefined;
  ProfileManagement: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Expenses: undefined;
  Capture: undefined;
  Budgets: undefined;
  Settings: undefined;
};

export type ExpensesStackParamList = {
  ExpensesList: undefined;
  RecurringExpenses: undefined;
};

export type BudgetsStackParamList = {
  BudgetsList: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  SecuritySettings: undefined;
  CurrencySettings: undefined;
};

// ─── API ──────────────────────────────────────────────────

export interface ApiEndpoints {
  geminiAnalyze: string;
  googleVisionOcr: string;
  [key: string]: string;
}

// ─── Biometric ────────────────────────────────────────────

export interface SecuritySettings {
  biometricEnabled: boolean;
  passcodeEnabled: boolean;
  passcode?: string;
}

// ─── Analytics ────────────────────────────────────────────

export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

export interface TopVendor {
  vendor: string;
  amount: number;
  count: number;
}

export interface AnalyticsInsight {
  type: string;
  title: string;
  message: string;
  icon: string;
  color: string;
}

export interface AnalyticsSummary {
  totalSpending: number;
  averagePerDay: number;
  transactionCount: number;
  categoriesUsed: number;
}

// ─── Profile ──────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileData {
  name: string;
  avatar?: string;
  color: string;
}

export interface ProfileStats {
  totalExpenses: number;
  totalSpent: number;
  budgetUsed: number;
}
