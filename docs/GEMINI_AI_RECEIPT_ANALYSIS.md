# Gemini AI Receipt Analysis & Image Storage

## Overview

This feature adds two key capabilities to the ReceiptTracker app:

1. **Persistent Receipt Image Storage** — Captured receipt images are saved to the device filesystem so they persist across app sessions.
2. **Gemini AI Receipt Analysis** — Uses Google Gemini 2.0 Flash Vision API to intelligently analyze receipt images and extract structured data (vendor, amount, date, line items, category, etc.).

## Architecture

### New Services

#### `ImageStorageService` (`src/services/ImageStorageService.js`)

Handles persistent storage of receipt images using `expo-file-system`.

- **`saveReceiptImage(sourceUri)`** — Copies a captured/picked image to a permanent directory (`{documentDirectory}/receipt_images/`) with a unique timestamped filename.
- **`deleteReceiptImage(imageUri)`** — Deletes a saved receipt image.
- **`getAllReceiptImages()`** — Lists all saved receipt image URIs.
- **`getStorageUsage()`** — Returns total storage used by receipt images in bytes.
- **`readImageAsBase64(imageUri)`** — Reads an image file as base64 string for API calls.

#### `GeminiService` (`src/services/GeminiService.js`)

Handles AI-powered receipt analysis using the Gemini Vision API.

- **`analyzeReceipt(imageUri)`** — Sends a receipt image to Gemini AI and returns structured data.
- **`getExtractionQuality(data)`** — Assesses the quality of extracted data (good/warning/poor).
- Includes rate limiting (max 8 requests per 60 seconds).
- Returns structured data: vendor, amount, date, currency, items, description, category, tax, subtotal, payment method, and confidence score.

### Modified Files

#### `CaptureScreen` (`src/screens/CaptureScreen.js`)

Updated to integrate both new services:

- **Image capture/pick** now automatically saves the image to persistent storage via `ImageStorageService`.
- **Processing flow** uses Gemini AI as the primary analyzer with OCR as a fallback:
  1. First attempts Gemini AI analysis
  2. If Gemini fails or returns low confidence, falls back to existing OCR service
  3. User always has the option to add expense manually
- **UI enhancements**:
  - Shows processing stage messages ("Sending to Gemini AI...", "Falling back to OCR...")
  - Displays source badge (Gemini AI / Cloud Vision / OCR) after processing
  - Shows confidence percentage
  - Shows item count when items are detected
  - Shows "Image saved" indicator when image is persisted
  - Shows "Powered by Gemini AI with OCR fallback" hint

## Processing Flow

```
User captures/picks image
        │
        ▼
Image saved to persistent storage (ImageStorageService)
        │
        ▼
User taps checkmark to process
        │
        ▼
┌─── Gemini AI Analysis ───┐
│  Send image as base64    │
│  to Gemini 2.0 Flash     │
│  Vision API              │
└──────────┬───────────────┘
           │
     ┌─────┴─────┐
     │ Success?  │
     └─────┬─────┘
       Yes │        No
           │         │
           ▼         ▼
   Show results   ┌──────────────┐
   + source badge │ OCR Fallback │
                  └──────┬───────┘
                         │
                   ┌─────┴─────┐
                   │ Success?  │
                   └─────┬─────┘
                     Yes │      No
                         │       │
                         ▼       ▼
                  Show results  Manual entry
```

## Data Extracted by Gemini AI

| Field | Type | Description |
|-------|------|-------------|
| `vendor` | string | Store or business name |
| `amount` | number | Total amount paid (including tax) |
| `date` | string | Date in YYYY-MM-DD format |
| `currency` | string | 3-letter currency code (USD, EUR, PHP, etc.) |
| `items` | array | Line items with name, price, quantity |
| `description` | string | Brief summary of the purchase |
| `category` | string | Mapped to app category ID (1-8) |
| `tax` | number | Tax amount |
| `subtotal` | number | Subtotal before tax |
| `paymentMethod` | string | Cash, Credit Card, Debit Card, etc. |
| `confidence` | number | 0.0 to 1.0 confidence score |

## Expense Metadata

When an expense is saved, additional metadata is stored:

- **`receiptImage`** — Permanent file URI of the saved receipt image
- **`analysisSource`** — Which service analyzed the receipt (`gemini_ai`, `google_cloud_vision`, or `manual`)
- **`analysisConfidence`** — Confidence score from the analysis (0.0 to 1.0)

## API Configuration

- **Model**: Gemini 2.0 Flash (`gemini-2.0-flash`)
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Temperature**: 0.1 (low for consistent, accurate extraction)
- **Max Output Tokens**: 2048

## Rate Limiting

- Maximum 8 requests per 60-second window
- When rate limited, user is offered OCR fallback or manual entry

## Error Handling

- If Gemini AI fails → automatic fallback to OCR
- If OCR fails → user prompted to add expense manually
- If image save fails → falls back to temporary URI
- All errors are logged to console for debugging

## Dependencies

No new dependencies required. Uses existing:
- `expo-file-system` (already in package.json)
- `fetch` API (built-in)
