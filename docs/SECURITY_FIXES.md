# Security Fixes Documentation

This document describes the security vulnerabilities identified during the Staging branch code review and the fixes applied.

## Summary

| # | Vulnerability | Severity | File(s) Modified | Status |
|---|--------------|----------|-------------------|--------|
| 2 | Weak Passcode Hashing | HIGH | `BiometricService.js` | Fixed |
| 3 | No Salt in Password Hashing | HIGH | `BiometricService.js` | Fixed |
| 4 | Insecure Random ID Generation | MEDIUM | `StorageService.js`, `RecurringExpenseService.js` | Fixed |
| 5 | No Input Sanitization in OCR Data | MEDIUM | `OCRService.js` | Fixed |
| 6 | API Key in Client-Side Code | HIGH | `GoogleCloudVisionConfig.js` | Fixed |
| 7 | No Rate Limiting on OCR Requests | MEDIUM | `OCRService.js` | Fixed |
| 8 | Unvalidated External Data | MEDIUM | `StorageService.js` | Fixed |

---

## Fix #2: Weak Passcode Hashing

**Before:** Passcode was "hashed" using `btoa()` (base64 encoding), which is trivially reversible.

**After:** Replaced with `Crypto.digestStringAsync` using SHA256 from `expo-crypto`. The passcode is now properly hashed with a cryptographic one-way function.

**File:** `src/services/BiometricService.js`

---

## Fix #3: No Salt in Password Hashing

**Before:** Even the planned SHA256 implementation had no salt, making it vulnerable to rainbow table attacks.

**After:** Added cryptographic salt generation using `Crypto.getRandomBytesAsync(16)`. The salt is:
- Generated once per user and stored in `SecureStore`
- Prepended to the passcode before hashing (`salt + passcode`)
- Cleaned up when the passcode is removed

**File:** `src/services/BiometricService.js`

**New functions:**
- `_generateSalt()` — Generates 16 random bytes as hex string
- `_getSalt()` — Retrieves existing salt or creates a new one

**Note:** Existing passcodes set with the old `btoa()` method will no longer validate. Users will need to reset their passcode after this update.

---

## Fix #4: Insecure Random ID Generation

**Before:** IDs were generated using `Date.now() + Math.random().toString(36)`, which is predictable and not cryptographically secure.

**After:** Created a shared utility `src/utils/generateSecureId.js` that uses `Crypto.getRandomBytesAsync(16)` for cryptographically secure random bytes. IDs now include:
- A base-36 timestamp for sortability
- 32 hex characters of cryptographic randomness
- An optional prefix for type identification (`exp_`, `bgt_`, `recurring_`)

**Files:**
- `src/utils/generateSecureId.js` (new)
- `src/services/StorageService.js`
- `src/services/RecurringExpenseService.js`

---

## Fix #5: No Input Sanitization in OCR Data

**Before:** OCR-extracted text was used directly without sanitization, risking injection of malicious content.

**After:** Added two sanitization functions to `OCRService`:
- `_sanitizeString(str)` — Strips script tags, HTML tags, control characters, `javascript:` URIs, inline event handlers, and limits string length to 500 characters
- `_sanitizeReceiptData(data)` — Applies `_sanitizeString` to `vendor`, `description`, `category`, and item `name` fields

Sanitization is applied in `parseReceiptText()` before returning results.

**File:** `src/services/OCRService.js`

---

## Fix #6: API Key in Client-Side Code

**Before:** A hardcoded Google Cloud Vision API key was used as a fallback:
```js
apiKey: process.env.GOOGLE_CLOUD_API_KEY || 'AIzaSy...'
```

**After:**
- Removed the hardcoded API key fallback; now defaults to `null`
- Added validation in `getUrl()` that warns when the key is missing
- Added JSDoc header with security guidance about using a backend proxy
- `isConfigured()` now also checks that the key is non-empty

**File:** `src/services/GoogleCloudVisionConfig.js`

**Action Required:** The previously exposed API key should be **rotated immediately** in the Google Cloud Console, as it was committed to git history.

---

## Fix #7: No Rate Limiting on OCR Requests

**Before:** No client-side rate limiting existed, allowing unlimited API calls.

**After:** Added a sliding-window rate limiter at the module level:
- **Max requests:** 10 per 60-second window
- Timestamps are tracked in an in-memory array
- Old timestamps are pruned on each check
- When rate-limited, `_tryCloudOCR` returns `null` and logs a warning, falling back to local pattern matching

**File:** `src/services/OCRService.js`

**New module-level functions:**
- `_isRateLimited()` — Checks if the request count exceeds the limit
- `_recordRequest()` — Records a new request timestamp

---

## Fix #8: Unvalidated External Data

**Before:** `importData()` only checked if data was an array before saving, with no per-item validation.

**After:** Comprehensive validation added:
- **Expenses:** Each expense is validated with `validateExpenseData()` and must have a valid `id`
- **Budgets:** Each budget is validated with `validateBudgetData()` and must have a valid `id`
- **Categories:** Each category must have a valid `id` (string) and `name` (non-empty string)
- **Settings:** Only allowed keys are imported, each type-checked against defaults. Unknown keys are silently dropped. Invalid types fall back to default values.
- Invalid entries are filtered out with warnings, not rejected entirely
- Returns `{ success: true, warnings: [...] }` with details of any skipped entries

**File:** `src/services/StorageService.js`

---

## Remaining Recommendations

1. **Rotate the exposed API key** — The hardcoded key in git history must be revoked
2. **Backend proxy for OCR** — Move API calls server-side to fully protect the key
3. **Passcode migration** — Consider a migration path for users with existing passcodes
4. **Encryption implementation** — The `encryptData`/`decryptData` functions are still broken (separate issue)
