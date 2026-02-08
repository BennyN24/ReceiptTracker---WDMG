import ImageStorageService from './ImageStorageService';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const GEMINI_API_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
  : null;

// Rate limiting: max 8 requests per 60 seconds
const RATE_LIMIT_MAX_REQUESTS = 8;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const _requestTimestamps = [];

const _isRateLimited = () => {
  const now = Date.now();
  while (_requestTimestamps.length > 0 && _requestTimestamps[0] <= now - RATE_LIMIT_WINDOW_MS) {
    _requestTimestamps.shift();
  }
  return _requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS;
};

const _recordRequest = () => {
  _requestTimestamps.push(Date.now());
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
    return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 0;
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

    if (_isRateLimited()) {
      console.warn('GeminiService: Rate limit exceeded. Please wait before scanning another receipt.');
      return { error: 'rate_limited', message: 'Too many requests. Please wait a moment and try again.' };
    }

    try {
      // Read image as base64
      const base64Image = await ImageStorageService.readImageAsBase64(imageUri);

      if (!base64Image) {
        console.error('GeminiService: Failed to read image as base64');
        return null;
      }

      _recordRequest();

      const requestBody = this._buildRequest(base64Image);
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GeminiService: API error ${response.status}:`, errorText);
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
   * Build the Gemini API request payload
   * @param {string} base64Image - Base64-encoded image data
   * @returns {object} Request body for Gemini API
   */
  _buildRequest(base64Image) {
    return {
      contents: [
        {
          parts: [
            {
              text: `You are a receipt analysis expert. Analyze this receipt image and extract the following information in JSON format. Be precise and accurate.

Return ONLY a valid JSON object with these fields:
{
  "vendor": "Store or business name (string)",
  "amount": total amount as a number (e.g. 25.99),
  "date": "date in YYYY-MM-DD format (string)",
  "currency": "3-letter currency code like USD, EUR, PHP etc.",
  "items": [
    {
      "name": "item name (string)",
      "price": price as a number,
      "quantity": quantity as a number
    }
  ],
  "description": "Brief summary of the purchase (string)",
  "category": "One of: Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Education, Other",
  "tax": tax amount as a number or null,
  "subtotal": subtotal amount as a number or null,
  "paymentMethod": "Cash, Credit Card, Debit Card, or other method if visible",
  "confidence": confidence score from 0.0 to 1.0 indicating how confident you are in the extraction
}

Important rules:
- If a field cannot be determined, use null for numbers and empty string "" for strings
- The "amount" should be the TOTAL amount paid (including tax)
- Items array can be empty if individual items are not readable
- Date should be extracted from the receipt, not today's date, unless no date is visible
- Be conservative with confidence score
- Return ONLY the JSON object, no markdown, no explanation, no code blocks`,
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
    };
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

    // Build description from items if not provided
    if (!sanitized.description && sanitized.items.length > 0) {
      sanitized.description = sanitized.items
        .map(i => i.name + (i.price ? ` - $${i.price.toFixed(2)}` : ''))
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
