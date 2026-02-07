import AsyncStorage from '@react-native-async-storage/async-storage';

const RECURRING_EXPENSES_KEY = '@receipt_tracker_recurring_expenses';

const RecurringExpenseService = {
  /**
   * Create a recurring expense
   */
  async createRecurringExpense(recurringExpense) {
    try {
      const id = `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newRecurringExpense = {
        id,
        vendor: recurringExpense.vendor,
        amount: recurringExpense.amount,
        category: recurringExpense.category,
        frequency: recurringExpense.frequency, // 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
        startDate: recurringExpense.startDate,
        endDate: recurringExpense.endDate || null,
        notes: recurringExpense.notes || '',
        isActive: true,
        nextDueDate: this._calculateNextDueDate(
          recurringExpense.startDate,
          recurringExpense.frequency
        ),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const expenses = await this.getRecurringExpenses();
      expenses.push(newRecurringExpense);
      await AsyncStorage.setItem(RECURRING_EXPENSES_KEY, JSON.stringify(expenses));

      return newRecurringExpense;
    } catch (error) {
      console.error('Create recurring expense error:', error);
      throw error;
    }
  },

  /**
   * Get all recurring expenses
   */
  async getRecurringExpenses() {
    try {
      const data = await AsyncStorage.getItem(RECURRING_EXPENSES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Get recurring expenses error:', error);
      return [];
    }
  },

  /**
   * Get active recurring expenses
   */
  async getActiveRecurringExpenses() {
    try {
      const expenses = await this.getRecurringExpenses();
      const now = new Date();

      return expenses.filter(expense => {
        if (!expense.isActive) return false;

        const startDate = new Date(expense.startDate);
        if (startDate > now) return false;

        if (expense.endDate) {
          const endDate = new Date(expense.endDate);
          if (endDate < now) return false;
        }

        return true;
      });
    } catch (error) {
      console.error('Get active recurring expenses error:', error);
      return [];
    }
  },

  /**
   * Update recurring expense
   */
  async updateRecurringExpense(id, updates) {
    try {
      const expenses = await this.getRecurringExpenses();
      const index = expenses.findIndex(e => e.id === id);

      if (index === -1) {
        throw new Error('Recurring expense not found');
      }

      expenses[index] = {
        ...expenses[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(RECURRING_EXPENSES_KEY, JSON.stringify(expenses));
      return expenses[index];
    } catch (error) {
      console.error('Update recurring expense error:', error);
      throw error;
    }
  },

  /**
   * Delete recurring expense
   */
  async deleteRecurringExpense(id) {
    try {
      const expenses = await this.getRecurringExpenses();
      const filtered = expenses.filter(e => e.id !== id);
      await AsyncStorage.setItem(RECURRING_EXPENSES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Delete recurring expense error:', error);
      throw error;
    }
  },

  /**
   * Get recurring expenses due today
   */
  async getExpensesDueToday() {
    try {
      const active = await this.getActiveRecurringExpenses();
      const today = new Date().toISOString().split('T')[0];

      return active.filter(expense => {
        const dueDate = expense.nextDueDate.split('T')[0];
        return dueDate === today;
      });
    } catch (error) {
      console.error('Get expenses due today error:', error);
      return [];
    }
  },

  /**
   * Process due recurring expenses (create actual expenses)
   */
  async processDueExpenses(StorageService) {
    try {
      const dueExpenses = await this.getExpensesDueToday();
      const createdExpenses = [];

      for (const recurring of dueExpenses) {
        // Create actual expense from recurring template
        const expense = await StorageService.addExpense({
          vendor: recurring.vendor,
          amount: recurring.amount,
          category: recurring.category,
          date: new Date().toISOString().split('T')[0],
          notes: `${recurring.notes} (Recurring)`.trim(),
          recurringId: recurring.id,
        });

        createdExpenses.push(expense);

        // Update next due date
        const nextDueDate = this._calculateNextDueDate(
          new Date().toISOString().split('T')[0],
          recurring.frequency
        );

        await this.updateRecurringExpense(recurring.id, { nextDueDate });
      }

      return createdExpenses;
    } catch (error) {
      console.error('Process due expenses error:', error);
      return [];
    }
  },

  /**
   * Calculate next due date based on frequency
   */
  _calculateNextDueDate(startDate, frequency) {
    const date = new Date(startDate);

    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }

    return date.toISOString();
  },

  /**
   * Get frequency display name
   */
  getFrequencyLabel(frequency) {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
    };

    return labels[frequency] || 'Monthly';
  },

  /**
   * Get all frequency options
   */
  getFrequencyOptions() {
    return [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Bi-weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'yearly', label: 'Yearly' },
    ];
  },

  /**
   * Calculate total recurring expenses for a period
   */
  async getTotalRecurringForPeriod(startDate, endDate) {
    try {
      const active = await this.getActiveRecurringExpenses();
      let total = 0;

      for (const expense of active) {
        const occurrences = this._countOccurrences(
          expense.startDate,
          startDate,
          endDate,
          expense.frequency
        );
        total += expense.amount * occurrences;
      }

      return total;
    } catch (error) {
      console.error('Get total recurring error:', error);
      return 0;
    }
  },

  /**
   * Count how many times a recurring expense occurs in a period
   */
  _countOccurrences(startDate, periodStart, periodEnd, frequency) {
    const start = new Date(startDate);
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);

    if (start > pEnd) return 0;

    let count = 0;
    let current = new Date(start);

    while (current <= pEnd) {
      if (current >= pStart && current <= pEnd) {
        count++;
      }

      // Move to next occurrence
      switch (frequency) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'biweekly':
          current.setDate(current.getDate() + 14);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'quarterly':
          current.setMonth(current.getMonth() + 3);
          break;
        case 'yearly':
          current.setFullYear(current.getFullYear() + 1);
          break;
        default:
          return count;
      }
    }

    return count;
  },
};

export default RecurringExpenseService;
