const CurrencyService = {
  // Supported currencies with symbols and exchange rates
  CURRENCIES: {
    USD: { symbol: '$', name: 'US Dollar', code: 'USD', rate: 1.0 },
    EUR: { symbol: '€', name: 'Euro', code: 'EUR', rate: 0.92 },
    GBP: { symbol: '£', name: 'British Pound', code: 'GBP', rate: 0.79 },
    JPY: { symbol: '¥', name: 'Japanese Yen', code: 'JPY', rate: 149.50 },
    CAD: { symbol: 'C$', name: 'Canadian Dollar', code: 'CAD', rate: 1.36 },
    AUD: { symbol: 'A$', name: 'Australian Dollar', code: 'AUD', rate: 1.53 },
    CHF: { symbol: 'CHF', name: 'Swiss Franc', code: 'CHF', rate: 0.88 },
    CNY: { symbol: '¥', name: 'Chinese Yuan', code: 'CNY', rate: 7.24 },
    INR: { symbol: '₹', name: 'Indian Rupee', code: 'INR', rate: 83.12 },
    MXN: { symbol: '$', name: 'Mexican Peso', code: 'MXN', rate: 17.05 },
    SGD: { symbol: 'S$', name: 'Singapore Dollar', code: 'SGD', rate: 1.34 },
    HKD: { symbol: 'HK$', name: 'Hong Kong Dollar', code: 'HKD', rate: 7.81 },
    NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', code: 'NZD', rate: 1.65 },
    ZAR: { symbol: 'R', name: 'South African Rand', code: 'ZAR', rate: 18.50 },
    BRL: { symbol: 'R$', name: 'Brazilian Real', code: 'BRL', rate: 4.97 },
    PHP: { symbol: '₱', name: 'Philippine Peso', code: 'PHP', rate: 56.75 },
  },

  /**
   * Get all available currencies
   */
  getAllCurrencies() {
    return Object.entries(this.CURRENCIES).map(([code, data]) => ({
      code,
      ...data,
    }));
  },

  /**
   * Get currency by code
   */
  getCurrency(code) {
    return this.CURRENCIES[code] || this.CURRENCIES.USD;
  },

  /**
   * Format amount with currency symbol
   */
  formatAmount(amount, currencyCode = 'USD') {
    const currency = this.getCurrency(currencyCode);
    const formatted = amount.toFixed(2);

    // Position symbol based on currency
    if (['JPY', 'CNY'].includes(currencyCode)) {
      return `${currency.symbol}${formatted}`;
    }
    return `${currency.symbol}${formatted}`;
  },

  /**
   * Convert amount from one currency to another
   */
  convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const fromRate = this.getCurrency(fromCurrency).rate;
    const toRate = this.getCurrency(toCurrency).rate;

    // Convert to USD first, then to target currency
    const inUSD = amount / fromRate;
    return inUSD * toRate;
  },

  /**
   * Get exchange rate between two currencies
   */
  getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    const fromRate = this.getCurrency(fromCurrency).rate;
    const toRate = this.getCurrency(toCurrency).rate;

    return toRate / fromRate;
  },

  /**
   * Update exchange rates (placeholder for API integration)
   */
  async updateExchangeRates() {
    try {
      // Placeholder for fetching live rates from API
      // Example: https://api.exchangerate-api.com/v4/latest/USD
      // const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      // const data = await response.json();
      // Update this.CURRENCIES with new rates
      
      return true;
    } catch (error) {
      console.error('Failed to update exchange rates:', error);
      return false;
    }
  },

  /**
   * Get currency symbol
   */
  getSymbol(currencyCode) {
    return this.getCurrency(currencyCode).symbol;
  },

  /**
   * Get currency name
   */
  getName(currencyCode) {
    return this.getCurrency(currencyCode).name;
  },

  /**
   * Parse amount string with currency
   */
  parseAmount(amountStr) {
    // Remove common currency symbols and parse number
    const cleaned = amountStr
      .replace(/[$€£¥₹]/g, '')
      .replace(/[^\d.-]/g, '')
      .trim();

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  },
};

export default CurrencyService;
