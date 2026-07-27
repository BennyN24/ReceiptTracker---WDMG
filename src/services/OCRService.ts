import type { ReceiptItem, ExtractedReceiptData } from '../types';

// ─── Internal types ───────────────────────────────────────

interface ParsedReceipt {
  vendor: string | null;
  amount: number | null;
  date: string;
  items: ReceiptItem[];
  description: string;
  category: string;
  confidence: number;
  receiptType?: string;
  source?: string;
}

interface ExtractionQualityResult {
  status: 'success' | 'partial' | 'warning' | 'failed';
  message: string;
  confidence?: number;
  issues?: string[];
}

interface DatePatternEntry {
  regex: RegExp;
  parse: (m: RegExpMatchArray) => string | null;
}

// ─── OCR Service ──────────────────────────────────────────

const OCRService = {
  /**
   * Sanitize a string by removing control characters, script tags, and trimming
   */
  _sanitizeString(str: string | null | undefined): string | null | undefined {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/<[^>]*script[^>]*>/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
      .substring(0, 500);
  },

  /**
   * Sanitize all fields in extracted receipt data
   */
  _sanitizeReceiptData(data: ParsedReceipt): ParsedReceipt {
    if (!data || typeof data !== 'object') return data;
    return {
      ...data,
      vendor: this._sanitizeString(data.vendor) as string | null,
      description: (this._sanitizeString(data.description) as string) || '',
      category: (this._sanitizeString(data.category) as string) || '8',
      items: Array.isArray(data.items)
        ? data.items.map((item) => ({
            ...item,
            name: (this._sanitizeString(item.name) as string) || '',
          }))
        : [],
    };
  },

  /**
   * Extract text from receipt image
   * Uses pattern matching and AI analysis
   */
  async extractReceiptData(imageUri: string): Promise<ParsedReceipt | null> {
    try {
      // Use local pattern matching
      return await this._extractWithPatternMatching(imageUri);
    } catch (error) {
      console.error('OCR extraction error:', error);
      return null;
    }
  },

  /**
   * Extract data using local pattern matching
   */
  async _extractWithPatternMatching(_imageUri: string): Promise<ParsedReceipt | null> {
    try {
      return {
        vendor: null,
        amount: null,
        date: new Date().toISOString().split('T')[0],
        items: [],
        description: '',
        category: '8',
        confidence: 0,
      };
    } catch (error) {
      console.error('Pattern matching error:', error);
      return null;
    }
  },

  /**
   * Parse extracted text to find vendor, amount, and date
   */
  parseReceiptText(text: string): ParsedReceipt | null {
    if (!text || typeof text !== 'string') return null;

    const cleaned = this._normalizeOCRText(text);
    const items = this._extractItems(cleaned);
    const vendor = this._extractVendor(cleaned);
    const result: ParsedReceipt = {
      vendor: vendor,
      amount: this._extractAmount(cleaned),
      date: this._extractDate(cleaned),
      items: items,
      description: items.length > 0 ? items.map((i) => i.name + (i.price ? ` - $${i.price.toFixed(2)}` : '')).join('\n') : '',
      category: this._matchCategory(vendor, items, cleaned),
      confidence: 0,
    };

    result.confidence = this._calculateConfidence(result);
    const sanitized = this._sanitizeReceiptData(result);
    return sanitized.vendor || sanitized.amount ? sanitized : null;
  },

  /**
   * Calculate confidence score for extracted data (0-1)
   */
  _calculateConfidence(data: ParsedReceipt | null): number {
    if (!data) return 0;

    let score = 0;
    let factors = 0;

    if (data.vendor && data.vendor.trim().length > 0) {
      score += 0.4;
      factors++;
    }

    if (data.amount && data.amount > 0) {
      score += 0.4;
      factors++;
    }

    if (data.date && this._isValidDate(data.date)) {
      score += 0.2;
      factors++;
    }

    return factors > 0 ? Math.min(score, 1) : 0;
  },

  /**
   * Extract vendor name from text
   */
  _extractVendor(text: string): string | null {
    if (!text || typeof text !== 'string') return null;

    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return null;

    const nonVendorPatterns: RegExp[] = [
      /^(receipt|invoice|bill|statement|order|confirmation|ticket)\b/i,
      /^(date|time|total|amount|subtotal|sub\s*total|tax|tip|balance|change)\b/i,
      /^(thank you|thanks|welcome|please|visit|call|have a|come again)\b/i,
      /^(cash|credit|debit|visa|mastercard|amex|discover|card|payment)\b/i,
      /^(cashier|clerk|server|table|register|terminal|trans|auth)\b/i,
      /^(member|loyalty|reward|points|savings|coupon)\b/i,
      /^(store\s*#|reg\s*#|check\s*#|order\s*#|ticket\s*#|receipt\s*#)/i,
      /^(tel|phone|fax|email|www\.|http)/i,
      /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/,
      /^\d{1,2}:\d{2}\s*(am|pm)?/i,
      /^\$?\d+[.,]\d{2}$/,
      /^[0-9]{10,}$/,
      /^[*]{3,}|^-{3,}|^={3,}|^_{3,}/,
      /^\(\d{3}\)\s*\d{3}[-.\s]\d{4}/,
      /^\d{3}[-.\s]\d{3}[-.\s]\d{4}/,
      /^\d+\s+(\w+\s+)?(street|st|ave|avenue|blvd|boulevard|road|rd|drive|dr|lane|ln|way|court|ct|place|pl)\b/i,
      /^(suite|ste|floor|fl|unit|apt|bldg)\s/i,
      /^[A-Z]{2}\s+\d{5}(-\d{4})?$/,
      /^\d{5}(-\d{4})?$/,
      /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i,
      /^(po\s*box|p\.o\.\s*box)\s/i,
      /^(open|closed|hours|mon|tue|wed|thu|fri|sat|sun)\b/i,
    ];

    const candidateLines = lines.slice(0, Math.min(lines.length, 10));
    const candidates: Array<{ line: string; score: number }> = [];

    for (const line of candidateLines) {
      if (line.length < 2 || line.length > 60) continue;
      if (nonVendorPatterns.some((p) => p.test(line))) continue;

      let score = 0;

      const letterRatio = (line.match(/[a-zA-Z]/g) || []).length / line.length;
      if (letterRatio > 0.7) score += 3;
      else if (letterRatio > 0.5) score += 1;

      if (line === line.toUpperCase() && /[A-Z]/.test(line)) score += 1;

      if (line.length <= 30) score += 2;
      else if (line.length <= 45) score += 1;

      if (/\d+.*\b(st|ave|blvd|rd|dr|ln|way|ct)\b/i.test(line)) score -= 5;
      if ((line.match(/\d/g) || []).length / line.length > 0.5) score -= 3;
      if (/\$\d+[.,]\d{2}/.test(line)) score -= 3;

      const idx = candidateLines.indexOf(line);
      if (idx === 0) score += 3;
      else if (idx === 1) score += 2;
      else if (idx === 2) score += 1;

      if (score > 0) {
        candidates.push({ line, score });
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    let vendor = candidates[0].line;

    if (vendor.length > 3 && vendor === vendor.toUpperCase() && /[A-Z]/.test(vendor)) {
      vendor = vendor.replace(/\b\w+/g, (w) =>
        w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      );
    }

    return vendor;
  },

  /**
   * Extract total amount from text
   */
  _extractAmount(text: string): number | null {
    if (!text || typeof text !== 'string') return null;

    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    const parseAmount = (str: string): number | null => {
      if (!str) return null;
      let s = str.trim();
      if (/^\d{1,3}(,\d{3})+\.\d{2}$/.test(s)) {
        s = s.replace(/,/g, '');
      } else if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(',', '.');
      }
      const val = parseFloat(s);
      return (val > 0 && val < 10000000) ? val : null;
    };

    const amtRegex = '(\\d{1,3}(?:[,.]\\d{3})*[,.]\\d{2}|\\d+[,.]\\d{2}|\\d+)';

    interface Tier {
      patterns: RegExp[];
      useLast?: boolean;
    }

    const tiers: Tier[] = [
      {
        patterns: [
          new RegExp('GRAND\\s*TOTAL\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
          new RegExp('TOTAL\\s*DUE\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
          new RegExp('AMOUNT\\s*DUE\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
          new RegExp('NET\\s*TOTAL\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
          new RegExp('BALANCE\\s*DUE\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
        ],
      },
      {
        patterns: [
          new RegExp('\\bTOTAL\\b\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
        ],
        useLast: true,
      },
      {
        patterns: [
          new RegExp('\\bAMOUNT\\b\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
          new RegExp('\\b(?:DUE|BALANCE|PAYABLE)\\b\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
        ],
      },
      {
        patterns: [
          new RegExp('SUB\\s*-?\\s*TOTAL\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
        ],
      },
    ];

    for (const tier of tiers) {
      let lastMatch: number | null = null;

      for (const pattern of tier.patterns) {
        for (const line of lines) {
          const m = line.match(pattern);
          if (m) {
            const val = parseAmount(m[1]);
            if (val !== null) {
              if (tier.useLast) {
                lastMatch = val;
              } else {
                return val;
              }
            }
          }
        }
      }

      if (lastMatch !== null) return lastMatch;
    }

    // Check for "TOTAL" on one line and amount on the next line
    for (let i = 0; i < lines.length; i++) {
      const upper = lines[i].toUpperCase().trim();
      if (/^(GRAND\s*)?TOTAL\s*:?\s*$/.test(upper) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const m = nextLine.match(new RegExp('\\$?\\s*' + amtRegex));
        if (m) {
          const val = parseAmount(m[1]);
          if (val !== null) return val;
        }
      }
    }

    // Fallback: find the largest dollar amount on any line
    let largestAmount: number | null = null;
    const genericPattern = new RegExp('\\$\\s*' + amtRegex, 'g');
    for (const line of lines) {
      let m: RegExpExecArray | null;
      while ((m = genericPattern.exec(line)) !== null) {
        const val = parseAmount(m[1]);
        if (val !== null && (largestAmount === null || val > largestAmount)) {
          largestAmount = val;
        }
      }
      genericPattern.lastIndex = 0;
    }

    return largestAmount;
  },

  /**
   * Extract date from text
   */
  _extractDate(text: string): string {
    if (!text || typeof text !== 'string') {
      return new Date().toISOString().split('T')[0];
    }

    const monthMap: Record<string, number> = {
      'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
      'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
      'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3, 'APRIL': 4, 'JUNE': 6,
      'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9, 'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12,
    };

    const buildDate = (year: string | number, month: string | number, day: string | number): string | null => {
      let y = typeof year === 'string' ? year : String(year);
      const m = typeof month === 'string' ? parseInt(month) : month;
      const d = typeof day === 'string' ? parseInt(day) : day;

      if (y.length === 2) {
        const yn = parseInt(y);
        y = yn < 50 ? '20' + y : '19' + y;
      }
      const yn = parseInt(y);

      if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && yn >= 1900 && yn <= 2100) {
        const date = new Date(yn, m - 1, d);
        if (!isNaN(date.getTime()) && date.getMonth() === m - 1) {
          return date.toISOString().split('T')[0];
        }
      }
      return null;
    };

    const lines = text.split('\n');

    const patterns: DatePatternEntry[] = [
      { regex: /DATE\s*[:\s]+(\d{1,2})[/\-.]([\d]{1,2})[/\-.](\d{2,4})/i, parse: (m) => buildDate(m[3], m[1], m[2]) },
      { regex: /DATE\s*[:\s]+(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/i, parse: (m) => buildDate(m[1], m[2], m[3]) },
      { regex: /DATE\s*[:\s]+(JAN\w*|FEB\w*|MAR\w*|APR\w*|MAY|JUN\w*|JUL\w*|AUG\w*|SEP\w*|OCT\w*|NOV\w*|DEC\w*)\s+(\d{1,2})[,\s]+(\d{4})/i, parse: (m) => {
        const mo = monthMap[m[1].substring(0, 3).toUpperCase()] || monthMap[m[1].toUpperCase()];
        return mo ? buildDate(m[3], mo, m[2]) : null;
      }},
      { regex: /DATE\s*[:\s]+(\d{1,2})\s+(JAN\w*|FEB\w*|MAR\w*|APR\w*|MAY|JUN\w*|JUL\w*|AUG\w*|SEP\w*|OCT\w*|NOV\w*|DEC\w*)\s+(\d{4})/i, parse: (m) => {
        const mo = monthMap[m[2].substring(0, 3).toUpperCase()] || monthMap[m[2].toUpperCase()];
        return mo ? buildDate(m[3], mo, m[1]) : null;
      }},
      { regex: /(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/, parse: (m) => buildDate(m[1], m[2], m[3]) },
      { regex: /(JAN\w*|FEB\w*|MAR\w*|APR\w*|MAY|JUN\w*|JUL\w*|AUG\w*|SEP\w*|OCT\w*|NOV\w*|DEC\w*)\s+(\d{1,2})[,\s]+(\d{4})/i, parse: (m) => {
        const mo = monthMap[m[1].substring(0, 3).toUpperCase()] || monthMap[m[1].toUpperCase()];
        return mo ? buildDate(m[3], mo, m[2]) : null;
      }},
      { regex: /(\d{1,2})\s+(JAN\w*|FEB\w*|MAR\w*|APR\w*|MAY|JUN\w*|JUL\w*|AUG\w*|SEP\w*|OCT\w*|NOV\w*|DEC\w*)\s+(\d{4})/i, parse: (m) => {
        const mo = monthMap[m[2].substring(0, 3).toUpperCase()] || monthMap[m[2].toUpperCase()];
        return mo ? buildDate(m[3], mo, m[1]) : null;
      }},
      { regex: /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/, parse: (m) => buildDate(m[3], m[1], m[2]) },
    ];

    for (const { regex, parse } of patterns) {
      for (const line of lines) {
        const match = line.match(regex);
        if (match) {
          const result = parse(match);
          if (result) return result;
        }
      }
    }

    return new Date().toISOString().split('T')[0];
  },

  /**
   * Match a category based on vendor name, items, and receipt text
   */
  _matchCategory(vendor: string | null, items: ReceiptItem[], text: string): string {
    const combined = [
      vendor || '',
      (items || []).map((i) => i.name).join(' '),
      text || '',
    ].join(' ').toUpperCase();

    const foodKeywords = [
      'RESTAURANT', 'CAFE', 'COFFEE', 'STARBUCKS', 'MCDONALD', 'BURGER',
      'PIZZA', 'SUSHI', 'DINER', 'BAKERY', 'BAR', 'GRILL', 'KITCHEN',
      'FOOD', 'DINING', 'EAT', 'LUNCH', 'DINNER', 'BREAKFAST', 'BRUNCH',
      'TACO', 'CHICKEN', 'SUBWAY', 'WENDY', 'KFC', 'DOMINO', 'CHIPOTLE',
      'PANERA', 'DUNKIN', 'TIM HORTON', 'PANDA EXPRESS', 'CHICK-FIL-A',
      'LATTE', 'ESPRESSO', 'MOCHA', 'CAPPUCCINO', 'MUFFIN', 'SANDWICH',
      'DONUT', 'BAGEL', 'SMOOTHIE', 'JUICE', 'TEA', 'BOBA',
    ];
    if (foodKeywords.some((k) => combined.includes(k))) return '1';

    const transportKeywords = [
      'UBER', 'LYFT', 'TAXI', 'CAB', 'GAS', 'FUEL', 'PETROL', 'SHELL',
      'CHEVRON', 'EXXON', 'BP', 'MOBIL', 'PARKING', 'TOLL', 'TRANSIT',
      'METRO', 'BUS', 'TRAIN', 'AIRLINE', 'FLIGHT', 'AIRPORT',
      'AUTO', 'CAR WASH', 'OIL CHANGE', 'TIRE', 'MECHANIC',
    ];
    if (transportKeywords.some((k) => combined.includes(k))) return '2';

    const shoppingKeywords = [
      'WALMART', 'TARGET', 'AMAZON', 'COSTCO', 'STORE', 'SHOP', 'MALL',
      'MARKET', 'RETAIL', 'OUTLET', 'BEST BUY', 'HOME DEPOT', 'LOWES',
      'IKEA', 'NORDSTROM', 'MACY', 'ZARA', 'H&M', 'GAP', 'NIKE',
      'ADIDAS', 'APPLE STORE', 'CLOTHING', 'APPAREL', 'SHOES',
      'GROCERY', 'SUPERMARKET', 'WHOLE FOODS', 'TRADER JOE',
      'KROGER', 'SAFEWAY', 'ALDI', 'PUBLIX', 'WALGREENS', 'CVS',
    ];
    if (shoppingKeywords.some((k) => combined.includes(k))) return '3';

    const entertainmentKeywords = [
      'CINEMA', 'MOVIE', 'THEATER', 'THEATRE', 'NETFLIX', 'SPOTIFY',
      'CONCERT', 'TICKET', 'GAME', 'ARCADE', 'BOWLING', 'MUSEUM',
      'PARK', 'ZOO', 'AMUSEMENT', 'ENTERTAINMENT', 'STREAMING',
      'DISNEY', 'HBO', 'HULU', 'YOUTUBE', 'SUBSCRIPTION',
    ];
    if (entertainmentKeywords.some((k) => combined.includes(k))) return '4';

    const billsKeywords = [
      'ELECTRIC', 'WATER', 'GAS BILL', 'UTILITY', 'INTERNET', 'WIFI',
      'PHONE BILL', 'MOBILE BILL', 'CABLE', 'INSURANCE', 'RENT',
      'MORTGAGE', 'AT&T', 'VERIZON', 'T-MOBILE', 'COMCAST', 'XFINITY',
      'SPECTRUM', 'BILL', 'INVOICE', 'STATEMENT', 'ACCOUNT',
    ];
    if (billsKeywords.some((k) => combined.includes(k))) return '5';

    const healthKeywords = [
      'HOSPITAL', 'CLINIC', 'DOCTOR', 'PHARMACY', 'MEDICAL', 'HEALTH',
      'DENTAL', 'DENTIST', 'OPTOMETRIST', 'VISION', 'PRESCRIPTION',
      'DRUG', 'MEDICINE', 'LAB', 'URGENT CARE', 'THERAPY',
    ];
    if (healthKeywords.some((k) => combined.includes(k))) return '6';

    const educationKeywords = [
      'SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TUITION', 'BOOK', 'COURSE',
      'CLASS', 'EDUCATION', 'TRAINING', 'SEMINAR', 'WORKSHOP',
      'LIBRARY', 'TEXTBOOK', 'STUDENT', 'ACADEMY',
    ];
    if (educationKeywords.some((k) => combined.includes(k))) return '7';

    return '8';
  },

  /**
   * Normalize OCR text to fix common artifacts and inconsistencies
   */
  _normalizeOCRText(text: string): string {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text;

    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    cleaned = cleaned.replace(/\t/g, '  ');

    cleaned = cleaned.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
    cleaned = cleaned.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
    cleaned = cleaned.replace(/\u2013/g, '-');
    cleaned = cleaned.replace(/\u2014/g, '-');
    cleaned = cleaned.replace(/\u2026/g, '...');
    cleaned = cleaned.replace(/\u00A0/g, ' ');

    cleaned = cleaned.replace(/\bUSS\b/g, 'US$');
    cleaned = cleaned.replace(/\bS\$/g, '$');

    cleaned = cleaned.replace(/\bS(\d+[.,]\d{2})/g, '$$$1');

    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    cleaned = cleaned.split('\n').map((l) => l.trimEnd()).join('\n').trim();

    return cleaned;
  },

  /**
   * Extract line items from receipt text
   */
  _extractItems(text: string): ReceiptItem[] {
    if (!text || typeof text !== 'string') return [];

    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const items: ReceiptItem[] = [];

    const skipPatterns: RegExp[] = [
      /^(receipt|invoice|bill|statement|order|confirmation|ticket)/i,
      /^(date|time|tel|phone|fax|email|www\.|http|store\s*#|reg\s*#|cashier|clerk|server|table)/i,
      /^(thank you|thanks|welcome|please|visit|call|have a|come again|see you)/i,
      /^(subtotal|sub\s*total|sub-total)\b/i,
      /^(total|grand\s*total|amount\s*due|balance|payable|net\s*total)\b/i,
      /^(tax|vat|gst|hst|pst|sales\s*tax|state\s*tax|county\s*tax|fed\s*tax)\b/i,
      /^(tip|gratuity|service\s*charge|delivery\s*fee|convenience\s*fee)\b/i,
      /^(cash|credit|debit|visa|mastercard|amex|discover|change|tender|paid)\b/i,
      /^(card|payment|transaction|auth|ref|terminal|approval|chip|swipe|tap)\b/i,
      /^(member|loyalty|reward|points|savings|you\s*saved|coupon\s*total)\b/i,
      /^(order\s*#|check\s*#|ticket\s*#|trans\s*#|receipt\s*#)/i,
      /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
      /^(\d{1,2}:\d{2}\s*(am|pm)?)/i,
      /^\d{10,}/,
      /^[*]{3,}|^-{3,}|^={3,}|^_{3,}/,
      /^\s*$/,
      /^(address|city|state|zip|street|ave|blvd|rd|dr|suite|ste|floor|fl)\b/i,
      /^\d+\s+(\w+\s+)?(street|st|ave|avenue|blvd|boulevard|road|rd|drive|dr|lane|ln|way|court|ct)\b/i,
      /^[A-Z]{2}\s+\d{5}/,
      /^\(\d{3}\)\s*\d{3}[-.\s]\d{4}/,
      /^\d{3}[-.\s]\d{3}[-.\s]\d{4}/,
    ];

    const summaryPatterns: RegExp[] = [
      /\b(subtotal|sub\s*total|total|grand\s*total|amount\s*due|balance|net)\b/i,
      /\b(tax|vat|gst|hst|tip|gratuity|service\s*charge)\b/i,
      /\b(change|cash\s*back|tender|paid|payment)\b/i,
      /\b(savings|you\s*saved|discount\s*total|coupon\s*total)\b/i,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (skipPatterns.some((p) => p.test(line))) continue;
      if (line.length < 3 || line.length > 120) continue;

      const cleanedLine = line.replace(/\s+[FTNXB]{1,2}\s*$/, '');

      const noSKU = cleanedLine
        .replace(/^\d{4,13}\s+/, '')
        .replace(/^[A-Z]{0,3}\d{4,8}\s+/, '')
        .replace(/^PLU\s*#?\s*\d+\s+/i, '');

      const parsed = this._parseItemLine(noSKU, summaryPatterns);
      if (parsed) {
        items.push(parsed);
        continue;
      }

      if (noSKU !== cleanedLine) {
        const parsed2 = this._parseItemLine(cleanedLine, summaryPatterns);
        if (parsed2) {
          items.push(parsed2);
          continue;
        }
      }

      // Handle multi-line items: name on one line, price on next
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const priceOnly = nextLine.match(/^\$?\s*(\d+[.,]\d{2})\s*[FTNXB]{0,2}\s*$/);
        if (priceOnly && line.length > 2 && !/\d+[.,]\d{2}/.test(line)) {
          const name = this._cleanItemName(noSKU);
          const price = parseFloat(priceOnly[1].replace(',', '.'));
          if (name && name.length > 1 && name.length < 80 && price > 0 && price < 50000) {
            if (!summaryPatterns.some((p) => p.test(name))) {
              items.push({ name, price, quantity: 1 });
              i++;
              continue;
            }
          }
        }
      }
    }

    return items;
  },

  /**
   * Parse a single line to extract item name, price, and quantity
   */
  _parseItemLine(line: string, summaryPatterns: RegExp[]): ReceiptItem | null {
    if (!line || line.length < 3) return null;

    // Quantity prefix patterns
    const qtyPrefixPatterns: RegExp[] = [
      /^(\d+)\s*[xX@]\s+(.+?)\s{1,}\$?\s*(\d+[.,]\d{2})\s*$/,
      /^(\d+)\s*[xX@]\s+(.+?)\s+\$(\d+[.,]\d{2})\s*$/,
    ];
    for (const p of qtyPrefixPatterns) {
      const m = line.match(p);
      if (m) {
        const name = this._cleanItemName(m[2]);
        const price = parseFloat(m[3].replace(',', '.'));
        const qty = parseInt(m[1]);
        if (name && name.length > 1 && price > 0 && price < 50000 && qty > 0 && qty < 1000) {
          if (!summaryPatterns.some((sp) => sp.test(name))) {
            return { name, price, quantity: qty };
          }
        }
      }
    }

    // Weight-based items
    const weightPatterns: RegExp[] = [
      /^(.+?)\s+(\d+[.,]\d+)\s*(lb|lbs|kg|oz|g)\s*@\s*\$?\s*\d+[.,]\d+\/\w+\s+\$?\s*(\d+[.,]\d{2})\s*$/i,
      /^(.+?)\s+(\d+[.,]\d+)\s*(lb|lbs|kg|oz|g)\s+\$?\s*(\d+[.,]\d{2})\s*$/i,
    ];
    for (const p of weightPatterns) {
      const m = line.match(p);
      if (m) {
        const name = this._cleanItemName(m[1]);
        const price = parseFloat(m[4].replace(',', '.'));
        const weight = parseFloat(m[2].replace(',', '.'));
        const unit = m[3].toLowerCase();
        if (name && name.length > 1 && price > 0 && price < 50000) {
          if (!summaryPatterns.some((sp) => sp.test(name))) {
            return { name: `${name} (${weight} ${unit})`, price, quantity: 1 };
          }
        }
      }
    }

    // Discount / coupon lines (negative amounts)
    const discountPatterns: RegExp[] = [
      /^(.+?)\s+[-]\$?\s*(\d+[.,]\d{2})\s*$/,
      /^(.+?)\s+\(\$?\s*(\d+[.,]\d{2})\)\s*$/,
      /^(.+?)\s+\$?\s*-(\d+[.,]\d{2})\s*$/,
    ];
    for (const p of discountPatterns) {
      const m = line.match(p);
      if (m) {
        const name = this._cleanItemName(m[1]);
        const price = -Math.abs(parseFloat(m[2].replace(',', '.')));
        if (name && name.length > 1 && /coupon|discount|off|save|promo|rebate|markdown/i.test(name)) {
          return { name, price, quantity: 1 };
        }
      }
    }

    // Standard item patterns (most common)
    const standardPatterns: RegExp[] = [
      /^(.+?)\s{2,}\$\s*(\d+[.,]\d{2})\s*$/,
      /^(.+?)\s{2,}(\d+[.,]\d{2})\s*$/,
      /^(.+?)\s+\$(\d+[.,]\d{2})\s*$/,
      /^(.+?)\.{2,}\s*\$?\s*(\d+[.,]\d{2})\s*$/,
      /^(.+?)-{2,}\s*\$?\s*(\d+[.,]\d{2})\s*$/,
      /^(.+?)\s+@\s*\$?\s*\d+[.,]\d{2,}\s+\$?\s*(\d+[.,]\d{2})\s*$/,
      /^(.+?)\s{2,}\d+\s{2,}\$?\s*(\d+[.,]\d{2})\s*$/,
      /^(\d+)\s+(.{2,}?)\s{2,}\$?\s*(\d+[.,]\d{2})\s*$/,
    ];

    for (const p of standardPatterns) {
      const m = line.match(p);
      if (m) {
        // Handle the "1 Item Name  $12.34" pattern (last pattern)
        if (m.length === 4 && /^\d+$/.test(m[1])) {
          const name = this._cleanItemName(m[2]);
          const price = parseFloat(m[3].replace(',', '.'));
          const qty = parseInt(m[1]);
          if (name && name.length > 1 && name.length < 80 && price > 0 && price < 50000 && qty > 0 && qty < 1000) {
            if (!summaryPatterns.some((sp) => sp.test(name))) {
              return { name, price, quantity: qty };
            }
          }
          continue;
        }

        const name = this._cleanItemName(m[1]);
        const price = parseFloat(m[2].replace(',', '.'));

        if (name && name.length > 1 && name.length < 80 && price > 0 && price < 50000) {
          if (!summaryPatterns.some((sp) => sp.test(name))) {
            return { name, price, quantity: 1 };
          }
        }
      }
    }

    return null;
  },

  /**
   * Clean up an item name extracted from a receipt line
   */
  _cleanItemName(name: string | null | undefined): string | null {
    if (!name) return null;

    let cleaned = name.trim();

    cleaned = cleaned.replace(/\s+[xX]\s*\d+\s*$/, '');
    cleaned = cleaned.replace(/\s+[FTNXB]{1,2}$/, '');
    cleaned = cleaned.replace(/^[\s*#-]+|[\s*#-]+$/g, '');
    cleaned = cleaned.replace(/^\d{1,3}\.\s+/, '');
    cleaned = cleaned.replace(/\s{2,}/g, ' ');

    if (cleaned.length > 3 && cleaned === cleaned.toUpperCase() && /[A-Z]/.test(cleaned)) {
      cleaned = cleaned.replace(/\b\w+/g, (w) =>
        w.length <= 2 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      );
    }

    return cleaned.length > 0 ? cleaned : null;
  },

  /**
   * Detect receipt type for better parsing
   */
  _detectReceiptType(text: string): string {
    if (!text || typeof text !== 'string') return 'unknown';

    const upperText = text.toUpperCase();

    if (upperText.includes('INVOICE')) return 'invoice';
    if (upperText.includes('RECEIPT') || upperText.includes('TILL')) return 'receipt';
    if (upperText.includes('BILL') || upperText.includes('STATEMENT')) return 'bill';
    if (upperText.includes('ORDER') || upperText.includes('CONFIRMATION')) return 'order';
    if (upperText.includes('TICKET')) return 'ticket';

    return 'unknown';
  },

  /**
   * Validate extracted data quality
   */
  validateExtraction(data: ParsedReceipt | null): boolean {
    if (!data) return false;

    const hasVendor = !!data.vendor && data.vendor.trim().length > 0;
    const hasAmount = !!data.amount && data.amount > 0;
    const hasDate = !!data.date && this._isValidDate(data.date);

    return hasVendor && hasAmount && hasDate;
  },

  /**
   * Get extraction quality assessment
   */
  getExtractionQuality(data: ParsedReceipt | null): ExtractionQualityResult {
    if (!data) return { status: 'failed', message: 'No data extracted' };

    const issues: string[] = [];

    if (!data.vendor || data.vendor.trim().length === 0) {
      issues.push('Vendor name not found');
    }

    if (!data.amount || data.amount <= 0) {
      issues.push('Amount not found or invalid');
    }

    if (!data.date || !this._isValidDate(data.date)) {
      issues.push('Date not found or invalid');
    }

    const confidence = data.confidence || 0;

    if (issues.length === 0) {
      return {
        status: 'success',
        message: 'All data extracted successfully',
        confidence,
        issues: [],
      };
    } else if (issues.length === 1) {
      return {
        status: 'partial',
        message: 'Partial extraction - some fields missing',
        confidence,
        issues,
      };
    } else {
      return {
        status: 'warning',
        message: 'Multiple fields missing - manual review recommended',
        confidence,
        issues,
      };
    }
  },

  /**
   * Check if date string is valid ISO format
   */
  _isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  },
};

export default OCRService;
