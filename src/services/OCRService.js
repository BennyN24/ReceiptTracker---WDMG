import { File } from 'expo-file-system';
import { API_ENDPOINTS } from '../config/api';
import * as Crypto from 'expo-crypto';

let _clientId = null;

const getClientId = async () => {
  if (_clientId) return _clientId;
  _clientId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Math.random().toString(36) + Date.now().toString()
  );
  return _clientId;
};

const OCRService = {
  /**
   * Sanitize a string by removing control characters, script tags, and trimming
   */
  _sanitizeString(str) {
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
  _sanitizeReceiptData(data) {
    if (!data || typeof data !== 'object') return data;
    return {
      ...data,
      vendor: this._sanitizeString(data.vendor),
      description: this._sanitizeString(data.description),
      category: this._sanitizeString(data.category),
      items: Array.isArray(data.items)
        ? data.items.map((item) => ({
            ...item,
            name: this._sanitizeString(item.name),
          }))
        : [],
    };
  },

  /**
   * Extract text from receipt image using cloud-based OCR
   * Falls back to basic pattern matching if API unavailable
   */
  async extractReceiptData(imageUri) {
    try {
      // Try cloud-based OCR first (Google Cloud Vision, AWS Textract, etc.)
      const extractedData = await this._tryCloudOCR(imageUri);
      if (extractedData) {
        return extractedData;
      }

      // Fallback to local pattern matching
      return await this._extractWithPatternMatching(imageUri);
    } catch (error) {
      console.error('OCR extraction error:', error);
      return null;
    }
  },

  /**
   * Attempt cloud-based OCR extraction using Google Cloud Vision API via backend proxy
   */
  async _tryCloudOCR(imageUri) {
    try {
      if (!API_ENDPOINTS.googleVisionOcr) {
        return null;
      }

      const file = new File(imageUri);
      const base64Image = await file.base64();

      const clientId = await getClientId();

      const response = await fetch(API_ENDPOINTS.googleVisionOcr, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': clientId,
        },
        body: JSON.stringify({ base64Image }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          console.warn('OCR rate limit exceeded. Please wait before scanning another receipt.');
        } else {
          console.warn(`Google Cloud Vision API error: ${response.status}`, errorData);
        }
        return null;
      }

      const result = await response.json();

      if (result.error) {
        console.warn('Google Cloud Vision API error:', result.error.message);
        return null;
      }

      if (result.responses && result.responses.length > 0) {
        const textAnnotations = result.responses[0].textAnnotations;
        if (textAnnotations && textAnnotations.length > 0) {
          const fullText = textAnnotations[0].description;
          const receiptType = this._detectReceiptType(fullText);
          const parsedData = this.parseReceiptText(fullText);
          
          if (parsedData) {
            return {
              ...parsedData,
              receiptType,
              source: 'google_cloud_vision',
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.warn('Google Cloud Vision API error:', error.message);
      return null;
    }
  },

  /**
   * Extract data using local pattern matching
   * Looks for common receipt patterns: vendor, amount, date
   */
  async _extractWithPatternMatching(imageUri) {
    try {
      // Read image file
      const file = new File(imageUri);
      const imageData = await file.base64();

      // Placeholder for local text extraction
      // In production, use a local OCR library like:
      // - react-native-ml-kit (Firebase ML Kit)
      // - tesseract.js
      // - paddle-ocr

      return {
        vendor: null,
        amount: null,
        date: new Date().toISOString().split('T')[0],
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
  parseReceiptText(text) {
    if (!text || typeof text !== 'string') return null;

    const cleaned = this._normalizeOCRText(text);
    const items = this._extractItems(cleaned);
    const vendor = this._extractVendor(cleaned);
    const result = {
      vendor: vendor,
      amount: this._extractAmount(cleaned),
      date: this._extractDate(cleaned),
      items: items,
      description: items.length > 0 ? items.map(i => i.name + (i.price ? ` - $${i.price.toFixed(2)}` : '')).join('\n') : '',
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
  _calculateConfidence(data) {
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
   * Scans the first several lines, filters out non-vendor content, and picks the best candidate
   */
  _extractVendor(text) {
    if (!text || typeof text !== 'string') return null;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return null;

    // Lines that are definitely NOT vendor names
    const nonVendorPatterns = [
      /^(receipt|invoice|bill|statement|order|confirmation|ticket)\b/i,
      /^(date|time|total|amount|subtotal|sub\s*total|tax|tip|balance|change)\b/i,
      /^(thank you|thanks|welcome|please|visit|call|have a|come again)\b/i,
      /^(cash|credit|debit|visa|mastercard|amex|discover|card|payment)\b/i,
      /^(cashier|clerk|server|table|register|terminal|trans|auth)\b/i,
      /^(member|loyalty|reward|points|savings|coupon)\b/i,
      /^(store\s*#|reg\s*#|check\s*#|order\s*#|ticket\s*#|receipt\s*#)/i,
      /^(tel|phone|fax|email|www\.|http)/i,
      /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/, // dates
      /^\d{1,2}:\d{2}\s*(am|pm)?/i, // times
      /^\$?\d+[.,]\d{2}$/, // standalone prices
      /^[0-9]{10,}$/, // long numbers (barcodes)
      /^[*]{3,}|^-{3,}|^={3,}|^_{3,}/, // separators
      /^\(\d{3}\)\s*\d{3}[-.\s]\d{4}/, // phone (xxx) xxx-xxxx
      /^\d{3}[-.\s]\d{3}[-.\s]\d{4}/, // phone xxx-xxx-xxxx
      /^\d+\s+(\w+\s+)?(street|st|ave|avenue|blvd|boulevard|road|rd|drive|dr|lane|ln|way|court|ct|place|pl)\b/i,
      /^(suite|ste|floor|fl|unit|apt|bldg)\s/i,
      /^[A-Z]{2}\s+\d{5}(-\d{4})?$/, // state + zip
      /^\d{5}(-\d{4})?$/, // zip code only
      /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i, // Canadian postal code
      /^(po\s*box|p\.o\.\s*box)\s/i,
      /^(open|closed|hours|mon|tue|wed|thu|fri|sat|sun)\b/i,
    ];

    // Only check the first ~10 lines (vendor is almost always near the top)
    const candidateLines = lines.slice(0, Math.min(lines.length, 10));
    const candidates = [];

    for (const line of candidateLines) {
      if (line.length < 2 || line.length > 60) continue;
      if (nonVendorPatterns.some(p => p.test(line))) continue;

      // Score the candidate
      let score = 0;

      // Prefer lines that are mostly letters (vendor names are text-heavy)
      const letterRatio = (line.match(/[a-zA-Z]/g) || []).length / line.length;
      if (letterRatio > 0.7) score += 3;
      else if (letterRatio > 0.5) score += 1;

      // Prefer ALL CAPS lines (many store names are printed in caps)
      if (line === line.toUpperCase() && /[A-Z]/.test(line)) score += 1;

      // Prefer shorter lines (store names are usually concise)
      if (line.length <= 30) score += 2;
      else if (line.length <= 45) score += 1;

      // Penalize lines that look like addresses (contain numbers + street words)
      if (/\d+.*\b(st|ave|blvd|rd|dr|ln|way|ct)\b/i.test(line)) score -= 5;

      // Penalize lines that are mostly numbers
      if ((line.match(/\d/g) || []).length / line.length > 0.5) score -= 3;

      // Penalize lines with prices embedded
      if (/\$\d+[.,]\d{2}/.test(line)) score -= 3;

      // Bonus for lines appearing first (vendor is usually line 1-3)
      const idx = candidateLines.indexOf(line);
      if (idx === 0) score += 3;
      else if (idx === 1) score += 2;
      else if (idx === 2) score += 1;

      if (score > 0) {
        candidates.push({ line, score });
      }
    }

    if (candidates.length === 0) return null;

    // Pick the highest-scoring candidate
    candidates.sort((a, b) => b.score - a.score);
    let vendor = candidates[0].line;

    // Title case if ALL CAPS
    if (vendor.length > 3 && vendor === vendor.toUpperCase() && /[A-Z]/.test(vendor)) {
      vendor = vendor.replace(/\b\w+/g, w =>
        w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      );
    }

    return vendor;
  },

  /**
   * Extract total amount from text
   * Handles thousands separators, various label formats, and prefers the last/final total
   */
  _extractAmount(text) {
    if (!text || typeof text !== 'string') return null;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Helper to parse an amount string like "1,234.56" or "1.234,56" or "123.45"
    const parseAmount = (str) => {
      if (!str) return null;
      let s = str.trim();
      // Handle "$1,234.56" — US format with thousands comma
      if (/^\d{1,3}(,\d{3})+\.\d{2}$/.test(s)) {
        s = s.replace(/,/g, '');
      }
      // Handle "1.234,56" — European format with thousands dot
      else if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
      }
      // Handle simple "123,45" as "123.45"
      else {
        s = s.replace(',', '.');
      }
      const val = parseFloat(s);
      return (val > 0 && val < 10000000) ? val : null;
    };

    // Amount pattern that handles thousands separators
    const amtRegex = '(\\d{1,3}(?:[,.]\\d{3})*[,.]\\d{2}|\\d+[,.]\\d{2}|\\d+)';

    // Priority tiers — higher priority labels first, prefer LAST match within each tier
    const tiers = [
      { // Tier 1: Grand Total / Total Due (highest priority)
        patterns: [
          new RegExp('GRAND\\s*TOTAL\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
          new RegExp('TOTAL\\s*DUE\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
          new RegExp('AMOUNT\\s*DUE\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
          new RegExp('NET\\s*TOTAL\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
          new RegExp('BALANCE\\s*DUE\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
        ],
      },
      { // Tier 2: Total (use LAST match — receipts often have subtotal labeled "total" then real total later)
        patterns: [
          new RegExp('\\bTOTAL\\b\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
        ],
        useLast: true,
      },
      { // Tier 3: Amount / Due / Balance / Payable
        patterns: [
          new RegExp('\\bAMOUNT\\b\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
          new RegExp('\\b(?:DUE|BALANCE|PAYABLE)\\b\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
        ],
      },
      { // Tier 4: Subtotal (fallback if no total found)
        patterns: [
          new RegExp('SUB\\s*-?\\s*TOTAL\\s*[:\\s.]*\\$?\\s*' + amtRegex, 'i'),
        ],
      },
    ];

    // Scan line-by-line for each tier
    for (const tier of tiers) {
      let lastMatch = null;

      for (const pattern of tier.patterns) {
        for (const line of lines) {
          const m = line.match(pattern);
          if (m) {
            const val = parseAmount(m[1]);
            if (val !== null) {
              if (tier.useLast) {
                lastMatch = val; // keep scanning for later matches
              } else {
                return val; // return first match for non-useLast tiers
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

    // Fallback: find the largest dollar amount on any line (likely the total)
    let largestAmount = null;
    const genericPattern = new RegExp('\\$\\s*' + amtRegex, 'g');
    for (const line of lines) {
      // Skip lines that are clearly items (have text before the price)
      let m;
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
   * Handles US, European, ISO, and text-based date formats
   */
  _extractDate(text) {
    if (!text || typeof text !== 'string') {
      return new Date().toISOString().split('T')[0];
    }

    const monthMap = {
      'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
      'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
      'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3, 'APRIL': 4, 'JUNE': 6,
      'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9, 'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12,
    };

    const buildDate = (year, month, day) => {
      let y = typeof year === 'string' ? year : String(year);
      let m = typeof month === 'string' ? parseInt(month) : month;
      let d = typeof day === 'string' ? parseInt(day) : day;

      // Handle 2-digit year
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

    // Patterns ordered by specificity — labeled dates first, then standalone
    const patterns = [
      // "DATE: MM/DD/YYYY" or "Date: DD-MM-YYYY" (labeled, with separators / - .)
      { regex: /DATE\s*[:\s]+(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/i, parse: (m) => buildDate(m[3], m[1], m[2]) },
      // "DATE: YYYY-MM-DD"
      { regex: /DATE\s*[:\s]+(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/i, parse: (m) => buildDate(m[1], m[2], m[3]) },
      // "DATE: January 15, 2026" or "DATE: 15 January 2026"
      { regex: /DATE\s*[:\s]+(JAN\w*|FEB\w*|MAR\w*|APR\w*|MAY|JUN\w*|JUL\w*|AUG\w*|SEP\w*|OCT\w*|NOV\w*|DEC\w*)\s+(\d{1,2})[,\s]+(\d{4})/i, parse: (m) => {
        const mo = monthMap[m[1].substring(0, 3).toUpperCase()] || monthMap[m[1].toUpperCase()];
        return mo ? buildDate(m[3], mo, m[2]) : null;
      }},
      { regex: /DATE\s*[:\s]+(\d{1,2})\s+(JAN\w*|FEB\w*|MAR\w*|APR\w*|MAY|JUN\w*|JUL\w*|AUG\w*|SEP\w*|OCT\w*|NOV\w*|DEC\w*)\s+(\d{4})/i, parse: (m) => {
        const mo = monthMap[m[2].substring(0, 3).toUpperCase()] || monthMap[m[2].toUpperCase()];
        return mo ? buildDate(m[3], mo, m[1]) : null;
      }},
      // ISO: "2026-02-08" (standalone)
      { regex: /(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/, parse: (m) => buildDate(m[1], m[2], m[3]) },
      // "February 8, 2026" or "Feb 8, 2026"
      { regex: /(JAN\w*|FEB\w*|MAR\w*|APR\w*|MAY|JUN\w*|JUL\w*|AUG\w*|SEP\w*|OCT\w*|NOV\w*|DEC\w*)\s+(\d{1,2})[,\s]+(\d{4})/i, parse: (m) => {
        const mo = monthMap[m[1].substring(0, 3).toUpperCase()] || monthMap[m[1].toUpperCase()];
        return mo ? buildDate(m[3], mo, m[2]) : null;
      }},
      // "8 February 2026" or "8 Feb 2026"
      { regex: /(\d{1,2})\s+(JAN\w*|FEB\w*|MAR\w*|APR\w*|MAY|JUN\w*|JUL\w*|AUG\w*|SEP\w*|OCT\w*|NOV\w*|DEC\w*)\s+(\d{4})/i, parse: (m) => {
        const mo = monthMap[m[2].substring(0, 3).toUpperCase()] || monthMap[m[2].toUpperCase()];
        return mo ? buildDate(m[3], mo, m[1]) : null;
      }},
      // "MM/DD/YYYY" or "DD/MM/YYYY" or "DD.MM.YYYY" (standalone numeric)
      { regex: /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/, parse: (m) => buildDate(m[3], m[1], m[2]) },
    ];

    // Try each line for each pattern
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
   * Returns category ID matching StorageService.getDefaultCategories()
   */
  _matchCategory(vendor, items, text) {
    const combined = [
      vendor || '',
      (items || []).map(i => i.name).join(' '),
      text || '',
    ].join(' ').toUpperCase();

    // Food & Dining (id: 1)
    const foodKeywords = [
      'RESTAURANT', 'CAFE', 'COFFEE', 'STARBUCKS', 'MCDONALD', 'BURGER',
      'PIZZA', 'SUSHI', 'DINER', 'BAKERY', 'BAR', 'GRILL', 'KITCHEN',
      'FOOD', 'DINING', 'EAT', 'LUNCH', 'DINNER', 'BREAKFAST', 'BRUNCH',
      'TACO', 'CHICKEN', 'SUBWAY', 'WENDY', 'KFC', 'DOMINO', 'CHIPOTLE',
      'PANERA', 'DUNKIN', 'TIM HORTON', 'PANDA EXPRESS', 'CHICK-FIL-A',
      'LATTE', 'ESPRESSO', 'MOCHA', 'CAPPUCCINO', 'MUFFIN', 'SANDWICH',
      'DONUT', 'BAGEL', 'SMOOTHIE', 'JUICE', 'TEA', 'BOBA',
    ];
    if (foodKeywords.some(k => combined.includes(k))) return '1';

    // Transportation (id: 2)
    const transportKeywords = [
      'UBER', 'LYFT', 'TAXI', 'CAB', 'GAS', 'FUEL', 'PETROL', 'SHELL',
      'CHEVRON', 'EXXON', 'BP', 'MOBIL', 'PARKING', 'TOLL', 'TRANSIT',
      'METRO', 'BUS', 'TRAIN', 'AIRLINE', 'FLIGHT', 'AIRPORT',
      'AUTO', 'CAR WASH', 'OIL CHANGE', 'TIRE', 'MECHANIC',
    ];
    if (transportKeywords.some(k => combined.includes(k))) return '2';

    // Shopping (id: 3)
    const shoppingKeywords = [
      'WALMART', 'TARGET', 'AMAZON', 'COSTCO', 'STORE', 'SHOP', 'MALL',
      'MARKET', 'RETAIL', 'OUTLET', 'BEST BUY', 'HOME DEPOT', 'LOWES',
      'IKEA', 'NORDSTROM', 'MACY', 'ZARA', 'H&M', 'GAP', 'NIKE',
      'ADIDAS', 'APPLE STORE', 'CLOTHING', 'APPAREL', 'SHOES',
      'GROCERY', 'SUPERMARKET', 'WHOLE FOODS', 'TRADER JOE',
      'KROGER', 'SAFEWAY', 'ALDI', 'PUBLIX', 'WALGREENS', 'CVS',
    ];
    if (shoppingKeywords.some(k => combined.includes(k))) return '3';

    // Entertainment (id: 4)
    const entertainmentKeywords = [
      'CINEMA', 'MOVIE', 'THEATER', 'THEATRE', 'NETFLIX', 'SPOTIFY',
      'CONCERT', 'TICKET', 'GAME', 'ARCADE', 'BOWLING', 'MUSEUM',
      'PARK', 'ZOO', 'AMUSEMENT', 'ENTERTAINMENT', 'STREAMING',
      'DISNEY', 'HBO', 'HULU', 'YOUTUBE', 'SUBSCRIPTION',
    ];
    if (entertainmentKeywords.some(k => combined.includes(k))) return '4';

    // Bills & Utilities (id: 5)
    const billsKeywords = [
      'ELECTRIC', 'WATER', 'GAS BILL', 'UTILITY', 'INTERNET', 'WIFI',
      'PHONE BILL', 'MOBILE BILL', 'CABLE', 'INSURANCE', 'RENT',
      'MORTGAGE', 'AT&T', 'VERIZON', 'T-MOBILE', 'COMCAST', 'XFINITY',
      'SPECTRUM', 'BILL', 'INVOICE', 'STATEMENT', 'ACCOUNT',
    ];
    if (billsKeywords.some(k => combined.includes(k))) return '5';

    // Healthcare (id: 6)
    const healthKeywords = [
      'HOSPITAL', 'CLINIC', 'DOCTOR', 'PHARMACY', 'MEDICAL', 'HEALTH',
      'DENTAL', 'DENTIST', 'OPTOMETRIST', 'VISION', 'PRESCRIPTION',
      'DRUG', 'MEDICINE', 'LAB', 'URGENT CARE', 'THERAPY',
    ];
    if (healthKeywords.some(k => combined.includes(k))) return '6';

    // Education (id: 7)
    const educationKeywords = [
      'SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TUITION', 'BOOK', 'COURSE',
      'CLASS', 'EDUCATION', 'TRAINING', 'SEMINAR', 'WORKSHOP',
      'LIBRARY', 'TEXTBOOK', 'STUDENT', 'ACADEMY',
    ];
    if (educationKeywords.some(k => combined.includes(k))) return '7';

    // Default: Other (id: 8)
    return '8';
  },

  /**
   * Normalize OCR text to fix common artifacts and inconsistencies
   */
  _normalizeOCRText(text) {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text;

    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Replace tabs with spaces
    cleaned = cleaned.replace(/\t/g, '  ');

    // Fix common OCR character substitutions
    cleaned = cleaned.replace(/[\u2018\u2019\u201A\u201B]/g, "'"); // smart quotes
    cleaned = cleaned.replace(/[\u201C\u201D\u201E\u201F]/g, '"'); // smart double quotes
    cleaned = cleaned.replace(/\u2013/g, '-'); // en dash
    cleaned = cleaned.replace(/\u2014/g, '-'); // em dash
    cleaned = cleaned.replace(/\u2026/g, '...'); // ellipsis
    cleaned = cleaned.replace(/\u00A0/g, ' '); // non-breaking space

    // Normalize currency symbols
    cleaned = cleaned.replace(/\bUSS\b/g, 'US$');
    cleaned = cleaned.replace(/\bS\$/g, '$');

    // Fix OCR misreads of dollar sign
    cleaned = cleaned.replace(/\bS(\d+[.,]\d{2})/g, '$$$$1');

    // Collapse multiple blank lines into one
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Remove leading/trailing whitespace per line but keep structure
    cleaned = cleaned.split('\n').map(l => l.trimEnd()).join('\n').trim();

    return cleaned;
  },

  /**
   * Extract line items from receipt text
   * Handles grocery lists, restaurant receipts, retail, invoices, and various layouts
   */
  _extractItems(text) {
    if (!text || typeof text !== 'string') return [];

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const items = [];

    // Lines to skip entirely
    const skipPatterns = [
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
      /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/, // date lines
      /^(\d{1,2}:\d{2}\s*(am|pm)?)/i, // time lines
      /^\d{10,}/, // long numbers (barcodes)
      /^[*]{3,}|^-{3,}|^={3,}|^_{3,}/, // separator lines
      /^\s*$/, // empty lines
      /^(address|city|state|zip|street|ave|blvd|rd|dr|suite|ste|floor|fl)\b/i,
      /^\d+\s+(\w+\s+)?(street|st|ave|avenue|blvd|boulevard|road|rd|drive|dr|lane|ln|way|court|ct)\b/i,
      /^[A-Z]{2}\s+\d{5}/, // state + zip
      /^\(\d{3}\)\s*\d{3}[-.\s]\d{4}/, // phone (xxx) xxx-xxxx
      /^\d{3}[-.\s]\d{3}[-.\s]\d{4}/, // phone xxx-xxx-xxxx
    ];

    // Patterns that indicate a line is a summary/footer, not an item
    const summaryPatterns = [
      /\b(subtotal|sub\s*total|total|grand\s*total|amount\s*due|balance|net)\b/i,
      /\b(tax|vat|gst|hst|tip|gratuity|service\s*charge)\b/i,
      /\b(change|cash\s*back|tender|paid|payment)\b/i,
      /\b(savings|you\s*saved|discount\s*total|coupon\s*total)\b/i,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip non-item lines
      if (skipPatterns.some(p => p.test(line))) continue;
      if (line.length < 3 || line.length > 120) continue;

      // Strip trailing tax/food-stamp indicators (F, T, N, FT, TF, X, B)
      const cleanedLine = line.replace(/\s+[FTNXB]{1,2}\s*$/, '');

      // Strip leading SKU/PLU/barcode codes
      const noSKU = cleanedLine
        .replace(/^\d{4,13}\s+/, '') // leading UPC/EAN barcode
        .replace(/^[A-Z]{0,3}\d{4,8}\s+/, '') // alphanumeric SKU
        .replace(/^PLU\s*#?\s*\d+\s+/i, ''); // PLU codes

      const parsed = this._parseItemLine(noSKU, summaryPatterns);
      if (parsed) {
        items.push(parsed);
        continue;
      }

      // Try with original line (SKU might be part of name)
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
        // Next line is just a price
        const priceOnly = nextLine.match(/^\$?\s*(\d+[.,]\d{2})\s*[FTNXB]{0,2}\s*$/);
        if (priceOnly && line.length > 2 && !/\d+[.,]\d{2}/.test(line)) {
          const name = this._cleanItemName(noSKU);
          const price = parseFloat(priceOnly[1].replace(',', '.'));
          if (name && name.length > 1 && name.length < 80 && price > 0 && price < 50000) {
            if (!summaryPatterns.some(p => p.test(name))) {
              items.push({ name, price, quantity: 1 });
              i++; // skip the price line
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
  _parseItemLine(line, summaryPatterns) {
    if (!line || line.length < 3) return null;

    // === Quantity prefix patterns ===
    // "2 x Item Name   $12.34" or "2x Item  12.34" or "2 @ Item  12.34"
    const qtyPrefixPatterns = [
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
          if (!summaryPatterns.some(sp => sp.test(name))) {
            return { name, price, quantity: qty };
          }
        }
      }
    }

    // === Weight-based items ===
    // "BANANAS  2.50 lb @ $0.59/lb  $1.48" or "GRAPES 1.2kg @ 3.99/kg  4.79"
    const weightPatterns = [
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
          if (!summaryPatterns.some(sp => sp.test(name))) {
            return { name: `${name} (${weight} ${unit})`, price, quantity: 1 };
          }
        }
      }
    }

    // === Discount / coupon lines (negative amounts) ===
    // "COUPON  -$1.00" or "MFR COUPON  -1.00" or "DISCOUNT  ($2.50)"
    const discountPatterns = [
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

    // === Standard item patterns (most common) ===
    const standardPatterns = [
      // "Item Name    $12.34" (2+ spaces then optional $ then price)
      /^(.+?)\s{2,}\$\s*(\d+[.,]\d{2})\s*$/,
      // "Item Name    12.34" (2+ spaces then price, no $)
      /^(.+?)\s{2,}(\d+[.,]\d{2})\s*$/,
      // "Item Name $12.34" (1+ spaces then $ then price)
      /^(.+?)\s+\$(\d+[.,]\d{2})\s*$/,
      // "Item Name..........$12.34" (dot leaders)
      /^(.+?)\.{2,}\s*\$?\s*(\d+[.,]\d{2})\s*$/,
      // "Item Name--------$12.34" (dash leaders)
      /^(.+?)-{2,}\s*\$?\s*(\d+[.,]\d{2})\s*$/,
      // "Item Name @ $X.XX  $12.34" (unit price then total)
      /^(.+?)\s+@\s*\$?\s*\d+[.,]\d{2,}\s+\$?\s*(\d+[.,]\d{2})\s*$/,
      // "Item Name  Qty  $12.34" (name, qty in middle, price at end)
      /^(.+?)\s{2,}\d+\s{2,}\$?\s*(\d+[.,]\d{2})\s*$/,
      // "1 Item Name  $12.34" (leading quantity with space)
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
            if (!summaryPatterns.some(sp => sp.test(name))) {
              return { name, price, quantity: qty };
            }
          }
          continue;
        }

        const name = this._cleanItemName(m[1]);
        const price = parseFloat(m[2].replace(',', '.'));

        if (name && name.length > 1 && name.length < 80 && price > 0 && price < 50000) {
          if (!summaryPatterns.some(sp => sp.test(name))) {
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
  _cleanItemName(name) {
    if (!name) return null;

    let cleaned = name.trim();

    // Remove trailing quantity indicators
    cleaned = cleaned.replace(/\s+[xX]\s*\d+\s*$/, '');

    // Remove trailing tax/category codes
    cleaned = cleaned.replace(/\s+[FTNXB]{1,2}$/, '');

    // Remove leading/trailing special characters
    cleaned = cleaned.replace(/^[\s*#-]+|[\s*#-]+$/g, '');

    // Remove leading item numbers like "1. " or "01 "
    cleaned = cleaned.replace(/^\d{1,3}\.\s+/, '');

    // Collapse multiple spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ');

    // Title case if ALL CAPS and more than 3 chars
    if (cleaned.length > 3 && cleaned === cleaned.toUpperCase() && /[A-Z]/.test(cleaned)) {
      cleaned = cleaned.replace(/\b\w+/g, w =>
        w.length <= 2 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      );
    }

    return cleaned.length > 0 ? cleaned : null;
  },

  /**
   * Detect receipt type for better parsing
   */
  _detectReceiptType(text) {
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
  validateExtraction(data) {
    if (!data) return false;

    const hasVendor = data.vendor && data.vendor.trim().length > 0;
    const hasAmount = data.amount && data.amount > 0;
    const hasDate = data.date && this._isValidDate(data.date);

    return hasVendor && hasAmount && hasDate;
  },

  /**
   * Get extraction quality assessment
   */
  getExtractionQuality(data) {
    if (!data) return { status: 'failed', message: 'No data extracted' };

    const issues = [];

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
        confidence: confidence,
        issues: [],
      };
    } else if (issues.length === 1) {
      return {
        status: 'partial',
        message: 'Partial extraction - some fields missing',
        confidence: confidence,
        issues: issues,
      };
    } else {
      return {
        status: 'warning',
        message: 'Multiple fields missing - manual review recommended',
        confidence: confidence,
        issues: issues,
      };
    }
  },

  /**
   * Check if date string is valid ISO format
   */
  _isValidDate(dateStr) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  },
};

export default OCRService;
