import type { NotificationHistoryItem } from '../types';

/**
 * Web stub for NotificationService.
 * Notifications are not supported on web platform - all methods are no-ops.
 */
const NotificationService = {
  async initialize(): Promise<boolean> {
    console.log('NotificationService (web stub): Notifications not supported on web');
    return false;
  },

  async sendBudgetAlert(budgetName: string, percentage: number, amount: number): Promise<void> {
    console.log(`Budget alert (web stub): ${budgetName} - ${percentage}%`);
  },

  async sendExpenseReminder(): Promise<void> {
    console.log('Expense reminder (web stub)');
  },

  async scheduleDailySummary(hour: number = 20, minute: number = 0): Promise<void> {
    console.log('Schedule daily summary (web stub)');
  },

  async scheduleWeeklyReview(weekday: number = 2, hour: number = 10, minute: number = 0): Promise<void> {
    console.log('Schedule weekly review (web stub)');
  },

  async cancelAllNotifications(): Promise<void> {
    console.log('Cancel notifications (web stub)');
  },

  async getHistory(): Promise<NotificationHistoryItem[]> {
    return [];
  },

  async clearHistory(): Promise<void> {
    console.log('Clear history (web stub)');
  },

  async _saveToHistory(notification: { title: string; body: string; type?: string }): Promise<void> {
    console.log('Save to history (web stub)');
  },
};

export default NotificationService;
