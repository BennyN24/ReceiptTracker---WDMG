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
    if (!text) return null;

    const result = {
      vendor: this._extractVendor(text),
      amount: this._extractAmount(text),
      date: this._extractDate(text),
    };

    return result.vendor || result.amount ? result : null;
  },

  /**
   * Extract vendor name from text
   */
  _extractVendor(text) {
    // Look for common vendor patterns
    const lines = text.split('\n').filter(l => l.trim());
    
    // Usually first non-empty line is vendor
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length > 2 && firstLine.length < 50) {
        return firstLine;
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
    // Match common date patterns
    const patterns = [
      /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/,  // MM/DD/YYYY or DD/MM/YYYY
      /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,    // YYYY/MM/DD
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          let year = match[3];
          let month = match[1];
          let day = match[2];

          // Handle 2-digit year
          if (year.length === 2) {
            year = parseInt(year) < 50 ? '20' + year : '19' + year;
          }

          // Try to parse as date
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          continue;
        }
      }
    }

    return new Date().toISOString().split('T')[0];
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
   * Check if date string is valid ISO format
   */
  _isValidDate(dateStr) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  },
};

export default OCRService;
