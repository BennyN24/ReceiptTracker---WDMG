/**
 * Web stub for LocationService.
 * Location services are not supported on web platform - all methods return null/false.
 */
const LocationService = {
  /**
   * Request location permission from the user.
   * Returns true if permission was granted, false otherwise.
   */
  async requestLocationPermission(): Promise<boolean> {
    console.log('LocationService (web stub): Location not supported on web');
    return false;
  },

  /**
   * Check if location permission has been granted.
   * Returns true if permission has been granted, false otherwise.
   */
  async hasLocationPermission(): Promise<boolean> {
    return false;
  },

  /**
   * Get the current location of the device.
   * Returns an object with latitude and longitude coordinates, or null if location is not available.
   */
  async getCurrentLocation(): Promise<{ coords: { latitude: number; longitude: number } } | null> {
    return null;
  },

  async getCountryFromCoordinates(latitude: number, longitude: number): Promise<string | null> {
    return null;
  },

  async getCachedLocation(): Promise<{ countryCode: string; currencyCode: string; timestamp: number } | null> {
    return null;
  },

  async cacheLocationData(countryCode: string, currencyCode: string): Promise<void> {
    console.log('Cache location (web stub)');
  },

  async detectCurrency(): Promise<{ currencyCode: string; countryCode: string } | null> {
    console.log('Detect currency (web stub): Returning null');
    return null;
  },

  async clearCache(): Promise<void> {
    console.log('Clear cache (web stub)');
  },
};

export default LocationService;
