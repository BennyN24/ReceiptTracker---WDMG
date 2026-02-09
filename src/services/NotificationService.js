import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CurrencyService from './CurrencyService';

const NOTIFICATION_STORAGE_KEY = '@receipt_tracker_notifications';

const NotificationService = {
  /**
   * Initialize notifications
   */
  async initialize() {
    try {
      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Notification initialization error:', error);
      return false;
    }
  },

  /**
   * Send budget alert notification
   */
  async sendBudgetAlert(budgetName, percentageUsed, remainingAmount, currencyCode = 'USD') {
    try {
      const symbol = CurrencyService.getSymbol(currencyCode);
      const title = `Budget Alert: ${budgetName}`;
      let body = '';

      if (percentageUsed >= 100) {
        body = `You've exceeded your budget! Amount over: ${symbol}${(remainingAmount * -1).toFixed(2)}`;
      } else if (percentageUsed >= 90) {
        body = `You're at ${percentageUsed.toFixed(0)}% of your budget. Remaining: ${symbol}${remainingAmount.toFixed(2)}`;
      } else if (percentageUsed >= 75) {
        body = `You're at ${percentageUsed.toFixed(0)}% of your budget. Remaining: ${symbol}${remainingAmount.toFixed(2)}`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'budget_alert',
            budgetName,
            percentageUsed,
          },
        },
        trigger: null, // Send immediately
      });

      // Store notification history
      await this._storeNotification({
        type: 'budget_alert',
        title,
        body,
        timestamp: new Date().toISOString(),
        budgetName,
        percentageUsed,
      });
    } catch (error) {
      console.error('Budget alert error:', error);
    }
  },

  /**
   * Send expense reminder notification
   */
  async sendExpenseReminder(message) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Expense Reminder',
          body: message,
          data: { type: 'expense_reminder' },
        },
        trigger: null,
      });

      await this._storeNotification({
        type: 'expense_reminder',
        title: 'Expense Reminder',
        body: message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Expense reminder error:', error);
    }
  },

  /**
   * Schedule daily budget summary notification
   */
  async scheduleDailySummary(hour = 20, minute = 0) {
    try {
      const trigger = {
        hour,
        minute,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Daily Budget Summary',
          body: 'Check your spending for today',
          data: { type: 'daily_summary' },
        },
        trigger,
      });
    } catch (error) {
      console.error('Daily summary scheduling error:', error);
    }
  },

  /**
   * Schedule weekly budget review notification
   */
  async scheduleWeeklyReview(dayOfWeek = 1, hour = 10, minute = 0) {
    try {
      const trigger = {
        weekday: dayOfWeek, // 1 = Sunday, 2 = Monday, etc.
        hour,
        minute,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Weekly Budget Review',
          body: 'Review your spending this week',
          data: { type: 'weekly_review' },
        },
        trigger,
      });
    } catch (error) {
      console.error('Weekly review scheduling error:', error);
    }
  },

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Cancel notifications error:', error);
    }
  },

  /**
   * Get notification history
   */
  async getNotificationHistory() {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Get notification history error:', error);
      return [];
    }
  },

  /**
   * Clear notification history
   */
  async clearNotificationHistory() {
    try {
      await AsyncStorage.removeItem(NOTIFICATION_STORAGE_KEY);
    } catch (error) {
      console.error('Clear notification history error:', error);
    }
  },

  /**
   * Store notification in history
   */
  async _storeNotification(notification) {
    try {
      const history = await this.getNotificationHistory();
      history.push(notification);

      // Keep only last 50 notifications
      if (history.length > 50) {
        history.shift();
      }

      await AsyncStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Store notification error:', error);
    }
  },
};

export default NotificationService;
