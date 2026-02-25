import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationHistoryItem } from '../types';

const NOTIFICATION_HISTORY_KEY = '@notification_history';

// Configure default notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NotificationService = {
  /**
   * Initialize notifications and request permissions.
   */
  async initialize(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Notification initialization error:', error);
      return false;
    }
  },

  /**
   * Send a budget alert notification.
   */
  async sendBudgetAlert(budgetName: string, percentage: number, amount: number): Promise<void> {
    try {
      const title = percentage >= 100 ? '🚨 Budget Exceeded!' : '⚠️ Budget Warning';
      const body = percentage >= 100
        ? `You've exceeded your ${budgetName} budget!`
        : `You've used ${percentage.toFixed(0)}% of your ${budgetName} budget ($${amount.toFixed(2)} remaining)`;

      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });

      await this._saveToHistory({ title, body, type: 'budget_alert' });
    } catch (error) {
      console.error('Budget alert error:', error);
    }
  },

  /**
   * Send an expense reminder notification.
   */
  async sendExpenseReminder(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📝 Expense Reminder',
          body: "Don't forget to log your expenses for today!",
        },
        trigger: null,
      });

      await this._saveToHistory({
        title: '📝 Expense Reminder',
        body: "Don't forget to log your expenses for today!",
        type: 'expense_reminder',
      });
    } catch (error) {
      console.error('Expense reminder error:', error);
    }
  },

  /**
   * Schedule a daily summary notification.
   */
  async scheduleDailySummary(hour: number = 20, minute: number = 0): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync('daily_summary');

      await Notifications.scheduleNotificationAsync({
        identifier: 'daily_summary',
        content: {
          title: '📊 Daily Summary',
          body: 'Check your spending summary for today',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    } catch (error) {
      console.error('Schedule daily summary error:', error);
    }
  },

  /**
   * Schedule a weekly review notification.
   */
  async scheduleWeeklyReview(weekday: number = 2, hour: number = 10, minute: number = 0): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync('weekly_review');

      await Notifications.scheduleNotificationAsync({
        identifier: 'weekly_review',
        content: {
          title: '📈 Weekly Review',
          body: 'Your weekly spending review is ready',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
        },
      });
    } catch (error) {
      console.error('Schedule weekly review error:', error);
    }
  },

  /**
   * Cancel all scheduled notifications.
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Cancel notifications error:', error);
    }
  },

  /**
   * Get notification history.
   */
  async getHistory(): Promise<NotificationHistoryItem[]> {
    try {
      const history = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Get notification history error:', error);
      return [];
    }
  },

  /**
   * Clear notification history.
   */
  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify([]));
    } catch (error) {
      console.error('Clear notification history error:', error);
    }
  },

  /**
   * Save a notification to history.
   */
  async _saveToHistory(notification: { title: string; body: string; type?: string }): Promise<void> {
    try {
      const history = await this.getHistory();
      const newEntry: NotificationHistoryItem = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        title: notification.title,
        body: notification.body,
        timestamp: new Date().toISOString(),
        type: notification.type,
      };
      history.unshift(newEntry);
      // Keep only last 50 notifications
      const trimmed = history.slice(0, 50);
      await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Save notification history error:', error);
    }
  },
};

export default NotificationService;
