import * as FileSystem from 'expo-file-system';

const OCRService = {
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
   * Attempt cloud-based OCR extraction
   * Placeholder for integration with Google Cloud Vision, AWS Textract, etc.
   */
  async _tryCloudOCR(imageUri) {
    try {
      // This is a placeholder for cloud OCR integration
      // To use: Set up Google Cloud Vision or similar service
      // const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     requests: [{
      //       image: { content: base64Image },
      //       features: [{ type: 'TEXT_DETECTION' }]
      //     }]
      //   })
      // });
      
      return null; // Not implemented yet
    } catch (error) {
      console.warn('Cloud OCR unavailable:', error);
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
      const imageData = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

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

    const result = {
      vendor: this._extractVendor(text),
      amount: this._extractAmount(text),
      date: this._extractDate(text),
      confidence: 0,
    };

    result.confidence = this._calculateConfidence(result);
    return result.vendor || result.amount ? result : null;
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
   */
  _extractVendor(text) {
    if (!text || typeof text !== 'string') return null;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length === 0) return null;

    // Filter out common non-vendor lines
    const nonVendorPatterns = [
      /^(receipt|invoice|bill|statement|order|confirmation)/i,
      /^(date|time|total|amount|subtotal|tax|tip|balance)/i,
      /^(thank you|thank|welcome|please|visit|call)/i,
      /^\d+[-/]\d+[-/]\d+/,
      /^\$?\d+[.,]\d{2}$/,
      /^[0-9]{10,}$/,
    ];

    for (const line of lines) {
      if (line.length > 2 && line.length < 60) {
        const isNonVendor = nonVendorPatterns.some(pattern => pattern.test(line));
        if (!isNonVendor) {
          return line;
        }
      }
    }

    return null;
  },

  /**
   * Extract amount from text
   */
  _extractAmount(text) {
    if (!text || typeof text !== 'string') return null;

    const normalizedText = text.toUpperCase().trim();
    
    // Match currency patterns: $123.45, 123.45, etc.
    const patterns = [
      /\$\s*(\d+[.,]\d{2})/,                    // $123.45 or $123,45
      /\$\s*(\d+)/,                             // $123
      /USD\s*[:\s]*(\d+[.,]\d{2})/i,           // USD: 123.45
      /USD\s*[:\s]*(\d+)/i,                     // USD: 123
      /TOTAL\s*[:\s]*\$?(\d+[.,]\d{2})/i,      // Total: 123.45
      /TOTAL\s*[:\s]*\$?(\d+)/i,               // Total: 123
      /AMOUNT\s*[:\s]*\$?(\d+[.,]\d{2})/i,     // Amount: 123.45
      /AMOUNT\s*[:\s]*\$?(\d+)/i,              // Amount: 123
      /SUBTOTAL\s*[:\s]*\$?(\d+[.,]\d{2})/i,   // Subtotal: 123.45
      /SUBTOTAL\s*[:\s]*\$?(\d+)/i,            // Subtotal: 123
      /GRAND\s*TOTAL\s*[:\s]*\$?(\d+[.,]\d{2})/i, // Grand Total: 123.45
      /GRAND\s*TOTAL\s*[:\s]*\$?(\d+)/i,       // Grand Total: 123
      /(?:DUE|BALANCE|PAYABLE)\s*[:\s]*\$?(\d+[.,]\d{2})/i, // Due/Balance: 123.45
      /(?:DUE|BALANCE|PAYABLE)\s*[:\s]*\$?(\d+)/i, // Due/Balance: 123
    ];

    for (const pattern of patterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        let amountStr = match[1].replace(/,/g, '.');
        const amount = parseFloat(amountStr);
        if (amount > 0 && amount < 1000000) {
          return amount;
        }
      }
    }

    return null;
  },

  /**
   * Extract date from text
   */
  _extractDate(text) {
    if (!text || typeof text !== 'string') {
      return new Date().toISOString().split('T')[0];
    }

    const normalizedText = text.toUpperCase();
    
    // Match common date patterns with priority
    const patterns = [
      { regex: /DATE\s*[:\s]*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i, groups: [1, 2, 3] },
      { regex: /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/, groups: [1, 2, 3], isYearFirst: true },
      { regex: /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/, groups: [1, 2, 3] },
      { regex: /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+(\d{1,2})[,\s]+(\d{4})/i, groups: [1, 2, 3], isMonthName: true },
      { regex: /(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+(\d{4})/i, groups: [1, 2, 3], isMonthName: true },
    ];

    const monthMap = {
      'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
      'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
    };

    for (const patternObj of patterns) {
      const match = normalizedText.match(patternObj.regex);
      if (match) {
        try {
          let year, month, day;

          if (patternObj.isYearFirst) {
            year = match[1];
            month = match[2];
            day = match[3];
          } else if (patternObj.isMonthName) {
            const monthStr = match[2].substring(0, 3).toUpperCase();
            month = monthMap[monthStr] || parseInt(match[2]);
            day = match[1];
            year = match[3];
          } else {
            month = match[1];
            day = match[2];
            year = match[3];
          }

          // Handle 2-digit year
          if (year.length === 2) {
            const yearNum = parseInt(year);
            year = yearNum < 50 ? '20' + year : '19' + year;
          }

          // Validate date
          const monthNum = parseInt(month);
          const dayNum = parseInt(day);
          const yearNum = parseInt(year);

          if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
            const date = new Date(yearNum, monthNum - 1, dayNum);
            if (!isNaN(date.getTime()) && date.getMonth() === monthNum - 1) {
              return date.toISOString().split('T')[0];
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    return new Date().toISOString().split('T')[0];
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
