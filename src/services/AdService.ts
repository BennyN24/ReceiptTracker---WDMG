import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

class AdService {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await mobileAds().initialize();
      
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });

      this.initialized = true;
      console.log('AdMob initialized successfully');
    } catch (error) {
      console.error('AdMob initialization error:', error);
    }
  }

  static getAdUnitIds() {
    return {
      banner: {
        dashboard: __DEV__ 
          ? 'ca-app-pub-3940256099942544/6300978111'
          : 'ca-app-pub-3678553543792849/7703046685',
        expenses: __DEV__
          ? 'ca-app-pub-3940256099942544/6300978111'
          : 'ca-app-pub-3678553543792849/1209285947',
        budgets: __DEV__
          ? 'ca-app-pub-3940256099942544/6300978111'
          : 'ca-app-pub-3678553543792849/2023674160',
        analytics: __DEV__
          ? 'ca-app-pub-3940256099942544/6300978111'
          : 'ca-app-pub-3678553543792849/2754660691',
      },
      interstitial: __DEV__
        ? 'ca-app-pub-3940256099942544/1033173712'
        : 'ca-app-pub-3678553543792849/9128497354',
    };
  }

  static isInitialized(): boolean {
    return this.initialized;
  }
}

export default AdService;
