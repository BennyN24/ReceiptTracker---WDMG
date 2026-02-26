import type { CurrencyInfo } from '../types';

interface CurrencyData {
  [code: string]: {
    symbol: string;
    name: string;
    rate: number;
  };
}

const CURRENCIES: CurrencyData = {
  USD: { symbol: '$', name: 'US Dollar', rate: 1 },
  EUR: { symbol: '€', name: 'Euro', rate: 0.92 },
  GBP: { symbol: '£', name: 'British Pound', rate: 0.79 },
  JPY: { symbol: '¥', name: 'Japanese Yen', rate: 149.50 },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', rate: 1.36 },
  AUD: { symbol: 'A$', name: 'Australian Dollar', rate: 1.53 },
  CHF: { symbol: 'CHF', name: 'Swiss Franc', rate: 0.88 },
  CNY: { symbol: '¥', name: 'Chinese Yuan', rate: 7.24 },
  INR: { symbol: '₹', name: 'Indian Rupee', rate: 83.12 },
  MXN: { symbol: '$', name: 'Mexican Peso', rate: 17.15 },
  BRL: { symbol: 'R$', name: 'Brazilian Real', rate: 4.97 },
  KRW: { symbol: '₩', name: 'South Korean Won', rate: 1320.50 },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', rate: 1.34 },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar', rate: 7.82 },
  SEK: { symbol: 'kr', name: 'Swedish Krona', rate: 10.45 },
  NOK: { symbol: 'kr', name: 'Norwegian Krone', rate: 10.55 },
  DKK: { symbol: 'kr', name: 'Danish Krone', rate: 6.88 },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', rate: 1.63 },
  ZAR: { symbol: 'R', name: 'South African Rand', rate: 18.65 },
  TRY: { symbol: '₺', name: 'Turkish Lira', rate: 27.50 },
  THB: { symbol: '฿', name: 'Thai Baht', rate: 35.20 },
  PHP: { symbol: '₱', name: 'Philippine Peso', rate: 56.30 },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah', rate: 15450 },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit', rate: 4.65 },
  TWD: { symbol: 'NT$', name: 'Taiwan Dollar', rate: 31.50 },
  PLN: { symbol: 'zł', name: 'Polish Zloty', rate: 4.05 },
  CZK: { symbol: 'Kč', name: 'Czech Koruna', rate: 22.50 },
  HUF: { symbol: 'Ft', name: 'Hungarian Forint', rate: 355 },
  ILS: { symbol: '₪', name: 'Israeli Shekel', rate: 3.65 },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', rate: 3.67 },
  SAR: { symbol: '﷼', name: 'Saudi Riyal', rate: 3.75 },
  CLP: { symbol: '$', name: 'Chilean Peso', rate: 880 },
  COP: { symbol: '$', name: 'Colombian Peso', rate: 3950 },
  ARS: { symbol: '$', name: 'Argentine Peso', rate: 350 },
  PEN: { symbol: 'S/.', name: 'Peruvian Sol', rate: 3.72 },
  EGP: { symbol: 'E£', name: 'Egyptian Pound', rate: 30.90 },
  NGN: { symbol: '₦', name: 'Nigerian Naira', rate: 780 },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', rate: 152 },
  GHS: { symbol: 'GH₵', name: 'Ghanaian Cedi', rate: 12.50 },
  VND: { symbol: '₫', name: 'Vietnamese Dong', rate: 24350 },
  PKR: { symbol: '₨', name: 'Pakistani Rupee', rate: 285 },
  BDT: { symbol: '৳', name: 'Bangladeshi Taka', rate: 110 },
  UAH: { symbol: '₴', name: 'Ukrainian Hryvnia', rate: 37.50 },
  RON: { symbol: 'lei', name: 'Romanian Leu', rate: 4.58 },
  BGN: { symbol: 'лв', name: 'Bulgarian Lev', rate: 1.80 },
  HRK: { symbol: 'kn', name: 'Croatian Kuna', rate: 6.95 },
  RSD: { symbol: 'din.', name: 'Serbian Dinar', rate: 108 },
};

const CurrencyService = {
  /**
   * Get all available currencies as a flat list.
   */
  getAllCurrencies(): CurrencyInfo[] {
    return Object.entries(CURRENCIES).map(([code, data]) => ({
      code,
      symbol: data.symbol,
      name: data.name,
      rate: data.rate,
    }));
  },

  /**
   * Get the symbol for a given currency code.
   */
  getSymbol(code: string): string {
    return CURRENCIES[code]?.symbol || '$';
  },

  /**
   * Get the full name for a given currency code.
   */
  getName(code: string): string {
    return CURRENCIES[code]?.name || code;
  },

  /**
   * Get the exchange rate for a given currency code (relative to USD).
   */
  getRate(code: string): number {
    return CURRENCIES[code]?.rate || 1;
  },

  /**
   * Convert an amount from one currency to another.
   */
  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    const fromRate = this.getRate(fromCurrency);
    const toRate = this.getRate(toCurrency);
    const usdAmount = amount / fromRate;
    return Math.round(usdAmount * toRate * 100) / 100;
  },

  /**
   * Format an amount with the currency symbol.
   */
  format(amount: number, currency: string = 'USD'): string {
    const symbol = this.getSymbol(currency);
    return `${symbol}${amount.toFixed(2)}`;
  },

  /**
   * Check if a currency code is valid (exists in our list).
   */
  isValid(code: string): boolean {
    return code in CURRENCIES;
  },
};

export default CurrencyService;
