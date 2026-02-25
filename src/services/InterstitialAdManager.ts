import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdService from './AdService';

class InterstitialAdManager {
  private static readonly EXPENSE_AD_FREQUENCY = 3;
  private static readonly BUDGET_AD_FREQUENCY = 2;
  private static readonly EXPENSE_COUNT_KEY = '@ad_expense_count';
  private static readonly BUDGET_COUNT_KEY = '@ad_budget_count';

  private static interstitialAd: InterstitialAd | null = null;
  private static isLoading = false;
  private static isLoaded = false;
  private static expenseCount = 0;
  private static budgetCount = 0;
  private static eventUnsubscribers: Array<() => void> = [];

  static async loadInterstitialAd(): Promise<void> {
    if (this.isLoading || this.isLoaded) return;

    this.isLoading = true;

    try {
      this.cleanup();

      const adUnitId = AdService.getAdUnitIds().interstitial;
      
      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      const loadedUnsubscribe = this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isLoaded = true;
        this.isLoading = false;
        console.log('Interstitial ad loaded successfully');
      });

      const errorUnsubscribe = this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('Interstitial ad load error:', error);
        this.isLoaded = false;
        this.isLoading = false;
        this.interstitialAd = null;
      });

      const closedUnsubscribe = this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.isLoaded = false;
        this.loadInterstitialAd();
      });

      this.eventUnsubscribers.push(loadedUnsubscribe, errorUnsubscribe, closedUnsubscribe);

      this.interstitialAd.load();
    } catch (error) {
      console.error('Failed to load interstitial ad:', error);
      this.isLoading = false;
      this.interstitialAd = null;
    }
  }

  static async showAfterExpenseCreation(): Promise<void> {
    try {
      this.expenseCount++;
      await this.saveCounter(this.EXPENSE_COUNT_KEY, this.expenseCount);
      
      if (this.expenseCount >= this.EXPENSE_AD_FREQUENCY) {
        await this.showInterstitial();
        this.expenseCount = 0;
        await this.saveCounter(this.EXPENSE_COUNT_KEY, 0);
      }
    } catch (error) {
      console.error('Error in showAfterExpenseCreation:', error);
    }
  }

  static async showAfterBudgetCreation(): Promise<void> {
    try {
      this.budgetCount++;
      await this.saveCounter(this.BUDGET_COUNT_KEY, this.budgetCount);
      
      if (this.budgetCount >= this.BUDGET_AD_FREQUENCY) {
        await this.showInterstitial();
        this.budgetCount = 0;
        await this.saveCounter(this.BUDGET_COUNT_KEY, 0);
      }
    } catch (error) {
      console.error('Error in showAfterBudgetCreation:', error);
    }
  }

  private static async showInterstitial(): Promise<void> {
    if (!this.isLoaded || !this.interstitialAd) {
      console.log('Interstitial ad not ready, skipping');
      return;
    }

    try {
      await this.interstitialAd.show();
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
    }
  }

  static async initialize(): Promise<void> {
    try {
      const [expenseCount, budgetCount] = await Promise.all([
        this.loadCounter(this.EXPENSE_COUNT_KEY),
        this.loadCounter(this.BUDGET_COUNT_KEY),
      ]);
      this.expenseCount = expenseCount;
      this.budgetCount = budgetCount;
    } catch (error) {
      console.error('Failed to initialize ad counters:', error);
    }
  }

  private static async loadCounter(key: string): Promise<number> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error(`Failed to load counter ${key}:`, error);
      return 0;
    }
  }

  private static async saveCounter(key: string, value: number): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error(`Failed to save counter ${key}:`, error);
    }
  }

  private static cleanup(): void {
    this.eventUnsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing event listener:', error);
      }
    });
    this.eventUnsubscribers = [];
  }

  static dispose(): void {
    this.cleanup();
    this.interstitialAd = null;
    this.isLoading = false;
    this.isLoaded = false;
  }

  static async resetCounters(): Promise<void> {
    try {
      this.expenseCount = 0;
      this.budgetCount = 0;
      await Promise.all([
        this.saveCounter(this.EXPENSE_COUNT_KEY, 0),
        this.saveCounter(this.BUDGET_COUNT_KEY, 0),
      ]);
    } catch (error) {
      console.error('Failed to reset counters:', error);
    }
  }
}

export default InterstitialAdManager;
