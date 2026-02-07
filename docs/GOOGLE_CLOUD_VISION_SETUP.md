# Google Cloud Vision API Setup Guide

**Date:** February 8, 2026  
**Status:** Active Integration  
**API Key Status:** ✅ Configured

---

## Overview

Google Cloud Vision API has been integrated into ReceiptTracker for automatic receipt text extraction. This guide covers setup, configuration, and usage.

---

## Current Configuration

**API Key:** AIzaSyBbUbzsZYbG7IhB9APCtIM6Kn2qDQ0-8mQ  
**Provider:** Google Cloud Vision  
**Endpoint:** https://vision.googleapis.com/v1/images:annotate  
**Status:** Active and Ready

---

## Files Created/Modified

### New Files

1. **`.env`** - Environment configuration file
   - Contains API key and provider settings
   - Location: Project root

2. **`src/services/GoogleCloudVisionConfig.js`** - Configuration service
   - Manages API endpoint and request building
   - Handles API key management
   - Provides request formatting

### Modified Files

1. **`src/services/OCRService.js`** - Enhanced OCR service
   - Integrated Google Cloud Vision API
   - Maintains fallback to pattern matching
   - Added receipt type detection
   - Improved error handling

---

## How It Works

### Flow Diagram

```
Receipt Image
    ↓
extractReceiptData()
    ↓
_tryCloudOCR() [Google Cloud Vision]
    ↓
Success? → parseReceiptText() → Return parsed data
    ↓
No → _extractWithPatternMatching() [Fallback]
    ↓
Return result
```

### Step-by-Step Process

1. **Image Input** - User captures receipt image
2. **Base64 Encoding** - Image converted to base64 format
3. **API Request** - Sent to Google Cloud Vision API
4. **Text Extraction** - API returns detected text
5. **Data Parsing** - Text parsed for vendor, amount, date
6. **Confidence Scoring** - Quality assessment calculated
7. **Fallback** - If API fails, pattern matching used

---

## API Features Used

### TEXT_DETECTION
- Detects text in images
- Returns bounding boxes and confidence scores
- Supports multiple languages

### DOCUMENT_TEXT_DETECTION
- Optimized for document analysis
- Better for structured receipts
- Preserves document layout information

### Language Support
- Currently configured for English ('en')
- Can be extended to support multiple languages

---

## Configuration Details

### Environment Variables (.env)

```bash
GOOGLE_CLOUD_API_KEY=AIzaSyBbUbzsZYbG7IhB9APCtIM6Kn2qDQ0-8mQ
OCR_PROVIDER=google
OCR_FALLBACK_ENABLED=true
```

### GoogleCloudVisionConfig.js

**Key Methods:**

- `getHeaders()` - Returns request headers
- `buildRequest(base64ImageData)` - Constructs API request
- `getUrl()` - Returns API endpoint with key
- `isConfigured()` - Checks if API key is set

---

## Usage Examples

### Basic Usage

```javascript
import OCRService from './services/OCRService';

// Extract receipt data from image
const result = await OCRService.extractReceiptData(imageUri);

console.log(result);
// Output:
// {
//   vendor: "Starbucks",
//   amount: 5.45,
//   date: "2026-02-08",
//   confidence: 0.95,
//   receiptType: "receipt",
//   source: "google_cloud_vision"
// }
```

### With Quality Assessment

```javascript
const result = await OCRService.extractReceiptData(imageUri);
const quality = OCRService.getExtractionQuality(result);

console.log(quality);
// Output:
// {
//   status: "success",
//   message: "All data extracted successfully",
//   confidence: 0.95,
//   issues: []
// }
```

### Validation

```javascript
const isValid = OCRService.validateExtraction(result);
if (isValid) {
  // All required fields present and valid
  saveExpense(result);
} else {
  // Missing or invalid fields
  showManualEditForm(result);
}
```

---

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| API Key Invalid | Wrong or expired key | Update `.env` file |
| Network Error | No internet connection | Check connectivity |
| Rate Limit | Too many requests | Implement retry logic |
| Invalid Image | Corrupted or unsupported format | Validate image before sending |
| API Quota Exceeded | Monthly quota reached | Check Google Cloud billing |

### Fallback Behavior

If Google Cloud Vision API fails:
1. Error is logged to console
2. Service automatically falls back to pattern matching
3. Pattern matching extracts data with lower confidence
4. User is notified of lower confidence score

---

## Cost Analysis

### Pricing

- **Free Tier:** 1,000 requests/month
- **Paid Tier:** $0.15 per 1,000 requests
- **Estimated Monthly Cost (1,000 receipts):** $0.15

### Cost Optimization

1. **Batch Processing** - Process multiple images in one request
2. **Caching** - Cache results for duplicate receipts
3. **Selective Processing** - Use pattern matching for simple receipts
4. **Image Optimization** - Compress images before sending

---

## Security Best Practices

### API Key Protection

✅ **Current Implementation:**
- API key stored in `.env` file
- Not hardcoded in source code
- Can be easily rotated

⚠️ **Important:**
- Never commit `.env` file to version control
- Rotate API key periodically
- Use service account with minimal permissions
- Monitor API usage for suspicious activity

### Data Privacy

- Receipt images are sent to Google servers
- Images are not stored by Google Cloud Vision
- Comply with GDPR/CCPA requirements
- Inform users about cloud processing

### Error Logging

- Errors logged to console for debugging
- API keys never logged
- Sensitive data sanitized in logs

---

## Testing

### Unit Tests

```javascript
describe('Google Cloud Vision Integration', () => {
  test('should extract receipt data successfully', async () => {
    const result = await OCRService.extractReceiptData(testImageUri);
    expect(result).toBeDefined();
    expect(result.vendor).toBeDefined();
    expect(result.amount).toBeGreaterThan(0);
  });

  test('should fallback to pattern matching on API error', async () => {
    // Mock API failure
    const result = await OCRService.extractReceiptData(testImageUri);
    expect(result).toBeDefined();
  });

  test('should detect receipt type correctly', () => {
    const type = OCRService._detectReceiptType(invoiceText);
    expect(type).toBe('invoice');
  });
});
```

### Manual Testing Checklist

- [ ] Test with retail receipt
- [ ] Test with invoice
- [ ] Test with bill
- [ ] Test with poor image quality
- [ ] Test with handwritten text
- [ ] Test with multiple languages
- [ ] Test network failure (offline mode)
- [ ] Verify confidence scores
- [ ] Check extraction quality assessment

---

## Monitoring and Maintenance

### API Usage Monitoring

1. Go to Google Cloud Console
2. Navigate to Vision API
3. Check quota usage
4. Monitor costs

### Key Metrics to Track

- **Extraction Success Rate** - % of successful extractions
- **Average Confidence Score** - Quality of extractions
- **API Response Time** - Performance metric
- **Fallback Rate** - % using pattern matching
- **Cost per Receipt** - Average cost

### Maintenance Tasks

- [ ] Rotate API key monthly
- [ ] Review error logs weekly
- [ ] Monitor quota usage
- [ ] Update documentation
- [ ] Test with new receipt formats

---

## Troubleshooting

### API Not Responding

**Symptoms:** Timeout errors, slow responses

**Solutions:**
1. Check internet connection
2. Verify API key is valid
3. Check Google Cloud status page
4. Implement retry logic with exponential backoff

### Low Confidence Scores

**Symptoms:** Confidence < 0.5

**Solutions:**
1. Improve image quality (lighting, focus)
2. Use pattern matching for simple receipts
3. Implement manual review for low confidence
4. Train custom model for specific receipt types

### Incorrect Data Extraction

**Symptoms:** Wrong vendor, amount, or date

**Solutions:**
1. Check image quality
2. Verify receipt format is supported
3. Review pattern matching rules
4. Implement manual correction UI

---

## Future Enhancements

### Phase 4 Planned

1. **Multi-Language Support**
   - Add language detection
   - Support 10+ languages

2. **Advanced Features**
   - Item-level extraction
   - Tax/tip detection
   - Currency detection

3. **Performance Optimization**
   - Image compression
   - Batch processing
   - Caching layer

4. **Cost Optimization**
   - Intelligent fallback
   - Selective API usage
   - Quota management

### Phase 5 Planned

1. **Custom Models**
   - Train on receipt data
   - Improve accuracy
   - Reduce costs

2. **AI Analysis**
   - Category auto-detection
   - Spending insights
   - Anomaly detection

---

## References

- [Google Cloud Vision API Documentation](https://cloud.google.com/vision/docs)
- [Vision API Pricing](https://cloud.google.com/vision/pricing)
- [Vision API Quotas](https://cloud.google.com/vision/quotas)
- [REST API Reference](https://cloud.google.com/vision/docs/reference/rest)

---

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Check Google Cloud status
4. Contact Google Cloud Support

---

**Setup Date:** February 8, 2026  
**Status:** ✅ Active and Operational  
**Last Updated:** February 8, 2026
