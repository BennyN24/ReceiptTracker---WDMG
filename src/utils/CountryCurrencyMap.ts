/**
 * Maps ISO 3166-1 alpha-2 country codes to their default ISO 4217 currency codes.
 * Used by LocationService to auto-detect the user's currency based on device location.
 */

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // North America
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',

  // Europe
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  PT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  CY: 'EUR',
  MT: 'EUR',
  HR: 'EUR',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  IS: 'ISK',
  RU: 'RUB',
  UA: 'UAH',
  RS: 'RSD',
  BA: 'BAM',
  AL: 'ALL',
  MK: 'MKD',
  ME: 'EUR',
  XK: 'EUR',
  AD: 'EUR',
  MC: 'EUR',
  SM: 'EUR',
  VA: 'EUR',
  LI: 'CHF',

  // Asia-Pacific
  JP: 'JPY',
  CN: 'CNY',
  IN: 'INR',
  KR: 'KRW',
  AU: 'AUD',
  NZ: 'NZD',
  SG: 'SGD',
  HK: 'HKD',
  TW: 'TWD',
  TH: 'THB',
  MY: 'MYR',
  ID: 'IDR',
  PH: 'PHP',
  VN: 'VND',
  BD: 'BDT',
  PK: 'PKR',
  LK: 'LKR',
  NP: 'NPR',
  MM: 'MMK',
  KH: 'KHR',
  LA: 'LAK',
  MN: 'MNT',
  BN: 'BND',
  FJ: 'FJD',
  PG: 'PGK',
  WS: 'WST',
  TO: 'TOP',

  // Middle East
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  JO: 'JOD',
  LB: 'LBP',
  IL: 'ILS',
  TR: 'TRY',
  IQ: 'IQD',
  IR: 'IRR',
  YE: 'YER',
  SY: 'SYP',

  // Africa
  ZA: 'ZAR',
  NG: 'NGN',
  EG: 'EGP',
  KE: 'KES',
  GH: 'GHS',
  TZ: 'TZS',
  ET: 'ETB',
  MA: 'MAD',
  TN: 'TND',
  DZ: 'DZD',
  UG: 'UGX',
  RW: 'RWF',
  MU: 'MUR',
  SN: 'XOF',
  CI: 'XOF',
  CM: 'XAF',
  GA: 'XAF',
  CD: 'CDF',
  AO: 'AOA',
  MZ: 'MZN',
  ZW: 'ZWL',
  BW: 'BWP',
  NA: 'NAD',
  MG: 'MGA',
  LY: 'LYD',
  SD: 'SDG',

  // South America
  BR: 'BRL',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  VE: 'VES',
  EC: 'USD',
  UY: 'UYU',
  PY: 'PYG',
  BO: 'BOB',
  GY: 'GYD',
  SR: 'SRD',

  // Central America & Caribbean
  PA: 'PAB',
  CR: 'CRC',
  GT: 'GTQ',
  HN: 'HNL',
  SV: 'USD',
  NI: 'NIO',
  BZ: 'BZD',
  JM: 'JMD',
  TT: 'TTD',
  BB: 'BBD',
  BS: 'BSD',
  DO: 'DOP',
  HT: 'HTG',
  CU: 'CUP',
  PR: 'USD',
  VI: 'USD',
  GU: 'USD',
  AS: 'USD',
};

/**
 * Returns the default currency code for a given country code.
 * Falls back to 'USD' if the country is not in the map.
 */
export const getCurrencyForCountry = (countryCode: string): string => {
  if (!countryCode) return 'USD';
  const normalized = countryCode.toUpperCase().trim();
  return COUNTRY_CURRENCY_MAP[normalized] || 'USD';
};

/**
 * Returns the full country-to-currency mapping object.
 */
export const getCountryCurrencyMap = (): Record<string, string> => {
  return { ...COUNTRY_CURRENCY_MAP };
};

export default COUNTRY_CURRENCY_MAP;
