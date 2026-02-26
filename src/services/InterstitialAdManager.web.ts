/**
 * Web stub for InterstitialAdManager.
 * Interstitial ads are not supported on web platform - all methods are no-ops.
 */
class InterstitialAdManager {
  static async loadInterstitialAd(): Promise<void> {
    console.log('InterstitialAdManager (web stub): Ads not supported on web');
  }

  static async showAfterExpenseCreation(): Promise<void> {
    console.log('Show ad after expense (web stub)');
  }

  static async showAfterBudgetCreation(): Promise<void> {
    console.log('Show ad after budget (web stub)');
  }

  static async initialize(): Promise<void> {
    console.log('InterstitialAdManager initialize (web stub)');
  }

  static dispose(): void {
    console.log('InterstitialAdManager dispose (web stub)');
  }

  static async resetCounters(): Promise<void> {
    console.log('Reset counters (web stub)');
  }
}

export default InterstitialAdManager;
