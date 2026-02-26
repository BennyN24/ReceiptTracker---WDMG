/**
 * Web stub for AdService.
 * Ads are not supported on web platform - all methods are no-ops.
 */
class AdService {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    console.log('AdService (web stub): Ads not supported on web');
  }

  static getAdUnitIds() {
    return {
      banner: {
        dashboard: '',
        expenses: '',
        budgets: '',
        analytics: '',
      },
      interstitial: '',
    };
  }

  static isInitialized(): boolean {
    return this.initialized;
  }
}

export default AdService;
