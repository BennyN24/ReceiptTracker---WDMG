import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrencyForCountry } from '../utils/CountryCurrencyMap';
import CurrencyService from './CurrencyService';

const LOCATION_CACHE_KEY = '@receipt_tracker_location_cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface LocationCache {
  countryCode: string;
  currencyCode: string;
  timestamp: number;
}

const LocationService = {
  /**
   * Request location permission from the user.
   * Returns true if permission was granted, false otherwise.
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Location permission request failed:', error);
      return false;
    }
  },

  /**
   * Check if location permission is already granted.
   */
  async hasLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Location permission check failed:', error);
      return false;
    }
  },

  /**
   * Get the device's current coordinates.
   * Uses low accuracy to minimize battery usage since we only need country-level data.
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.hasLocationPermission();
      if (!hasPermission) {
        console.warn('Location permission not granted');
        return null;
      }

      // Try last known position first (faster, no GPS spin-up)
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        return lastKnown;
      }

      // Fall back to active position request
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      return location;
    } catch (error) {
      console.error('Failed to get current location:', error);
      return null;
    }
  },

  /**
   * Reverse geocode coordinates to get the country code.
   * Uses expo-location's built-in reverse geocoding with a fallback
   * to the Nominatim HTTP API if the native geocoder fails
   * (e.g. Android NullPointerException when country code is null).
   */
  async getCountryFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    // Attempt 1: native reverse geocoder
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results && results.length > 0) {
        const { isoCountryCode } = results[0];
        if (isoCountryCode) return isoCountryCode;
      }
    } catch (error) {
      console.warn('Native reverse geocoding failed, trying fallback:', error);
    }

    // Attempt 2: Nominatim HTTP fallback (no API key required)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=3`,
          {
            headers: {
              'User-Agent': 'ReceiptTracker/1.0',
              Accept: 'application/json',
            },
            signal: controller.signal,
          }
        );

        if (response.ok) {
          const data = await response.json();
          const countryCode = data?.address?.country_code;
          if (countryCode && typeof countryCode === 'string') {
            return countryCode.toUpperCase();
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (fallbackError) {
      console.error('Fallback reverse geocoding also failed:', fallbackError);
    }

    return null;
  },

  /**
   * Get cached location data if it exists and is still valid.
   */
  async getCachedLocation(): Promise<LocationCache | null> {
    try {
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (!cached) return null;

      const data: LocationCache = JSON.parse(cached);
      const now = Date.now();

      if (now - data.timestamp < CACHE_DURATION_MS) {
        return data;
      }
      return null;
    } catch (error) {
      console.error('Failed to read location cache:', error);
      return null;
    }
  },

  /**
   * Save location data to cache.
   */
  async cacheLocationData(
    countryCode: string,
    currencyCode: string
  ): Promise<void> {
    try {
      const data: LocationCache = {
        countryCode,
        currencyCode,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to cache location data:', error);
    }
  },

  /**
   * Detect the user's currency based on device location.
   * Returns the detected currency code, or null if detection fails.
   *
   * Flow:
   * 1. Check cache first
   * 2. Request location permission if needed
   * 3. Get coordinates
   * 4. Reverse geocode to country
   * 5. Map country to currency
   * 6. Validate currency is supported
   * 7. Cache result
   */
  async detectCurrency(): Promise<{
    currencyCode: string;
    countryCode: string;
  } | null> {
    try {
      // Check cache first
      const cached = await this.getCachedLocation();
      if (cached) {
        return {
          currencyCode: cached.currencyCode,
          countryCode: cached.countryCode,
        };
      }

      // Request permission
      const granted = await this.requestLocationPermission();
      if (!granted) {
        console.warn('Location permission denied by user');
        return null;
      }

      // Get current location
      const location = await this.getCurrentLocation();
      if (!location) {
        return null;
      }

      // Reverse geocode to get country
      const countryCode = await this.getCountryFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );

      if (!countryCode) {
        return null;
      }

      // Map country to currency
      const detectedCurrency = getCurrencyForCountry(countryCode);

      // Verify the detected currency is supported by CurrencyService
      const supportedCurrencies = CurrencyService.getAllCurrencies().map(
        (c: { code: string }) => c.code
      );
      const currencyCode = supportedCurrencies.includes(detectedCurrency)
        ? detectedCurrency
        : 'USD';

      // Cache the result
      await this.cacheLocationData(countryCode, currencyCode);

      return { currencyCode, countryCode };
    } catch (error) {
      console.error('Currency detection failed:', error);
      return null;
    }
  },

  /**
   * Clear the location cache, forcing a fresh detection on next call.
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear location cache:', error);
    }
  },
};

export default LocationService;
