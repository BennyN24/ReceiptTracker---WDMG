import ImageStorageService from './ImageStorageService';
import { API_ENDPOINTS } from '../config/api';
import * as Crypto from 'expo-crypto';
import CurrencyService from './CurrencyService';

let _clientId = null;

const getClientId = async () => {
  if (_clientId) return _clientId;
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  _clientId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    hex
  );
  return _clientId;
};

/**
 * Gemini AI Service for receipt image analysis.
 * Uses Google Gemini Vision API to extract structured data from receipt images
 * including vendor, amount, date, line items, and category suggestions.
 */
const GeminiService = {
  /**
   * Check if Gemini API is properly configured
   */
  isConfigured() {
    return !!API_ENDPOINTS.geminiAnalyze;
  },

  /**
   * Analyze a receipt image using Gemini AI Vision
   * @param {string} imageUri - The URI of the receipt image
   * @returns {Promise<object|null>} Extracted receipt data or null on failure
   */
  async analyzeReceipt(imageUri) {
    if (!this.isConfigured()) {
      return null;
    }

    if (!imageUri || typeof imageUri !== 'string') {
      console.error('GeminiService: Invalid image URI');
      return null;
    }

    try {
      const base64Image = await ImageStorageService.readImageAsBase64(imageUri);

      if (!base64Image) {
        console.error('GeminiService: Failed to read image as base64');
        return null;
      }

      const clientId = await getClientId();

      const response = await fetch(API_ENDPOINTS.geminiAnalyze, {
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
          console.warn('GeminiService: Rate limit exceeded');
        } else {
          console.error(`GeminiService: API error ${response.status}:`, errorData);
        }
        return null;
      }

      const result = await response.json();
      return this._parseResponse(result);
    } catch (error) {
      console.error('GeminiService: Analysis failed:', error);
      return null;
    }
  },


  /**
   * Parse the Gemini API response and extract structured receipt data
   * @param {object} apiResponse - Raw API response
   * @returns {object|null} Parsed receipt data
   */
  _parseResponse(apiResponse) {
    try {
      if (!apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.warn('GeminiService: No text content in response');
        return null;
      }

      let text = apiResponse.candidates[0].content.parts[0].text.trim();

      // Strip markdown code fences if present
      text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

      const parsed = JSON.parse(text);
      return this._sanitizeAndValidate(parsed);
    } catch (error) {
      console.error('GeminiService: Failed to parse response:', error);
      return null;
    }
  },

  /**
   * Sanitize and validate the parsed receipt data
   * @param {object} data - Raw parsed data
   * @returns {object} Sanitized receipt data
   */
  _sanitizeAndValidate(data) {
    if (!data || typeof data !== 'object') return null;

    const sanitized = {
      vendor: this._sanitizeString(data.vendor) || '',
      amount: this._sanitizeNumber(data.amount),
      date: this._sanitizeDate(data.date),
      currency: this._sanitizeString(data.currency) || 'USD',
      items: this._sanitizeItems(data.items),
      description: this._sanitizeString(data.description) || '',
      category: this._mapCategory(data.category),
      tax: this._sanitizeNumber(data.tax),
      subtotal: this._sanitizeNumber(data.subtotal),
      paymentMethod: this._sanitizeString(data.paymentMethod) || '',
      confidence: typeof data.confidence === 'number'
        ? Math.min(Math.max(data.confidence, 0), 1)
        : 0.5,
      source: 'gemini_ai',
    };

    // Build description from items (always prefer itemized list over generic AI description)
    if (sanitized.items.length > 0) {
      sanitized.description = sanitized.items
        .map(i => {
          let line = i.quantity > 1 ? `${i.quantity}x ` : '';
          line += i.name;
          if (i.price) line += ` - ${CurrencyService.getSymbol(sanitized.currency)}${i.price.toFixed(2)}`;
          return line;
        })
        .join('\n');
    }

    return sanitized;
  },

  /**
   * Map category string to category ID
   * @param {string} categoryName - Category name from Gemini
   * @returns {string} Category ID matching StorageService categories
   */
  _mapCategory(categoryName) {
    if (!categoryName || typeof categoryName !== 'string') return '8';

    const mapping = {
      'food & dining': '1',
      'food': '1',
      'dining': '1',
      'restaurant': '1',
      'groceries': '1',
      'transportation': '2',
      'transport': '2',
      'travel': '2',
      'gas': '2',
      'fuel': '2',
      'shopping': '3',
      'retail': '3',
      'entertainment': '4',
      'bills & utilities': '5',
      'bills': '5',
      'utilities': '5',
      'healthcare': '6',
      'health': '6',
      'medical': '6',
      'pharmacy': '6',
      'education': '7',
      'other': '8',
    };

    const lower = categoryName.toLowerCase().trim();
    return mapping[lower] || '8';
  },

  /**
   * Sanitize a string value
   */
  _sanitizeString(str) {
    if (!str || typeof str !== 'string') return null;
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
   * Sanitize a numeric value
   */
  _sanitizeNumber(val) {
    if (val === null || val === undefined) return null;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (typeof num !== 'number' || isNaN(num)) return null;
    return Math.round(num * 100) / 100;
  },

  /**
   * Sanitize and validate a date string
   */
  _sanitizeDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
      return new Date().toISOString().split('T')[0];
    }

    // Try parsing YYYY-MM-DD
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      if (!isNaN(date.getTime())) {
        return dateStr;
      }
    }

    // Try parsing other formats
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  },

  /**
   * Sanitize items array
   */
  _sanitizeItems(items) {
    if (!Array.isArray(items)) return [];

    return items
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        name: this._sanitizeString(item.name) || 'Unknown Item',
        price: this._sanitizeNumber(item.price),
        quantity: typeof item.quantity === 'number' && item.quantity > 0
          ? Math.round(item.quantity)
          : 1,
      }))
      .filter(item => item.name !== 'Unknown Item' || item.price !== null);
  },

  /**
   * Get extraction quality assessment
   * @param {object} data - Extracted receipt data
   * @returns {object} Quality assessment with status and message
   */
  getExtractionQuality(data) {
    if (!data) {
      return { status: 'error', message: 'No data extracted' };
    }

    const hasVendor = data.vendor && data.vendor.length > 0;
    const hasAmount = data.amount !== null && data.amount > 0;
    const hasDate = data.date && data.date.length > 0;
    const confidence = data.confidence || 0;

    if (hasVendor && hasAmount && hasDate && confidence >= 0.7) {
      return { status: 'good', message: 'Receipt data extracted successfully' };
    }

    if ((hasVendor || hasAmount) && confidence >= 0.4) {
      return {
        status: 'warning',
        message: 'Some fields could not be extracted. Please review and fill in missing details.',
      };
    }

    return {
      status: 'poor',
      message: 'Could not reliably extract receipt data. Please enter details manually.',
    };
  },
};

export default GeminiService;
