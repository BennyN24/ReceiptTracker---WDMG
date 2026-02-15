# OCR Robustness Improvements

**Date:** February 8, 2026  
**Status:** ✅ Complete  
**File:** `src/services/OCRService.js`

---

## Overview

Major overhaul of the OCR text parsing engine to handle diverse receipt formats including long grocery lists, restaurant receipts, invoices, utility bills, gas station receipts, and international formats.

---

## New Methods

### `_normalizeOCRText(text)`
Pre-processes raw OCR text before parsing:
- Normalizes line endings (`\r\n` → `\n`)
- Replaces tabs with spaces
- Fixes smart quotes, en/em dashes, ellipsis, non-breaking spaces
- Normalizes currency symbols (OCR misreads like `S` → `$`)
- Collapses multiple blank lines

### `_parseItemLine(line, summaryPatterns)`
Dedicated single-line item parser supporting:
- **Quantity prefix**: `2 x Item Name  $12.34`, `3@ Widget  5.97`
- **Weight-based**: `BANANAS 2.50 lb @ $0.59/lb  $1.48`
- **Discounts/coupons**: `COUPON -$1.00`, `DISCOUNT ($2.50)`
- **Standard formats**: space-separated, dollar-sign separated, dot/dash leaders
- **Qty-in-middle**: `Item Name  2  $12.34`
- **Leading quantity**: `1 Item Name  $12.34`

### `_cleanItemName(name)`
Cleans extracted item names:
- Strips trailing tax/food-stamp codes (F, T, N, X, B)
- Removes SKU prefixes, item numbers, trailing quantity indicators
- Collapses multiple spaces
- Converts ALL CAPS to Title Case for readability

---

## Improved Methods

### `_extractItems(text)` — Complete Rewrite
- **50+ skip patterns** for non-item lines (addresses, phone numbers, store metadata, payment info, loyalty programs, separators, barcodes)
- **SKU/PLU stripping** — removes leading UPC/EAN barcodes and PLU codes before parsing
- **Tax indicator stripping** — removes trailing F/T/N/X/B codes from grocery receipts
- **Multi-line item support** — detects when item name is on one line and price on the next
- **Fallback parsing** — tries with and without SKU stripping

### `_extractVendor(text)` — Scoring-Based Selection
- Scans first 10 lines and **scores** each candidate instead of just picking the first valid line
- **Filters out**: addresses, phone numbers, zip codes, store/register numbers, dates, times, separators, postal codes
- **Scoring factors**: letter ratio, ALL CAPS bonus, line length, position bonus, address/number penalties
- **Title case conversion** for ALL CAPS vendor names

### `_extractAmount(text)` — Tiered Priority System
- **Thousands separator support**: `$1,234.56` (US), `1.234,56` (European)
- **4-tier priority**: Grand Total → Total (last match) → Amount/Due/Balance → Subtotal
- **Last-match preference** for "TOTAL" tier (receipts often have subtotal before total)
- **Next-line detection**: handles "TOTAL" on one line, amount on the next
- **Largest-amount fallback**: if no labeled total found, picks the largest `$X.XX` value

### `_extractDate(text)` — Multi-Format Support
- **Labeled dates first**: `DATE: MM/DD/YYYY`, `DATE: January 15, 2026`
- **ISO format**: `2026-02-08`
- **Text-based**: `February 8, 2026`, `8 Feb 2026`
- **European**: `DD.MM.YYYY`, `DD-MM-YYYY`
- **Full month names**: January through December (not just abbreviations)
- **Line-by-line scanning** for better accuracy

---

## Receipt Formats Supported

| Format | Example | Support |
|--------|---------|---------|
| Grocery (long list) | Walmart, Kroger, Costco | ✅ SKU stripping, weight items, tax codes |
| Restaurant | Starbucks, Chipotle | ✅ Item + price, tip detection |
| Retail | Target, Best Buy | ✅ Standard item lines |
| Invoice | Business invoices | ✅ Amount Due, Balance Due |
| Utility Bill | Electric, Water, Internet | ✅ Account/Balance patterns |
| Gas Station | Shell, Chevron | ✅ Gallons + price patterns |
| European | Comma decimals, dot thousands | ✅ `1.234,56` format |
| Coupons/Discounts | `-$1.00`, `($2.50)` | ✅ Negative amounts |
| Weight-based | `2.5 lb @ $0.59/lb` | ✅ Weight + unit price |
| Multi-line items | Name on line 1, price on line 2 | ✅ Next-line detection |

---

## Data Flow

```
Raw OCR Text
    → _normalizeOCRText()     [clean artifacts]
    → _extractItems()         [parse line items]
        → _parseItemLine()    [per-line parsing]
        → _cleanItemName()    [name cleanup]
    → _extractVendor()        [scored selection]
    → _extractAmount()        [tiered total search]
    → _extractDate()          [multi-format dates]
    → _matchCategory()        [keyword matching]
    → Result with confidence score
```
