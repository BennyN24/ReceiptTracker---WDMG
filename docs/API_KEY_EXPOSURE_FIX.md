# API Key Exposure Fix

**Date:** February 9, 2026  
**Severity:** CRITICAL  
**Status:** ✅ Remediated

---

## Summary

A Google Cloud Vision API key was found exposed in the git history across multiple files. The key has been removed from all commits using `git filter-branch` and the cleaned history has been force-pushed to the remote.

## Affected Files

| File | Exposure Type | Status |
|------|--------------|--------|
| `src/services/GoogleCloudVisionConfig.js` | Hardcoded fallback key | Fixed (already cleaned in prior commit) |
| `docs/GOOGLE_CLOUD_VISION_SETUP.md` | Key in plaintext documentation | Fixed |
| `docs/SECURITY_FIXES.md` | Key referenced in fix description | Fixed |

## Actions Taken

1. **Removed key from current files** — Replaced with placeholders (`your_api_key_here`, env reference)
2. **Rewrote git history** — Used `git filter-branch` to replace the key with `REDACTED_API_KEY` across all commits
3. **Cleaned backup refs** — Removed `refs/original/` backup references
4. **Expired reflog and garbage collected** — Ensured old objects are fully purged
5. **Force-pushed** — All branches pushed with `--force --all` to overwrite remote history

## Required User Action

> **⚠️ CRITICAL: Rotate the exposed API key immediately.**

The key `AIzaSy...` was publicly visible on GitHub. Even though it has been removed from git history, it may have been cached or scraped. You must:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Find the exposed API key
3. **Delete or regenerate** the key
4. Update your `.env` file with the new key
5. Restrict the new key to only the Vision API and your app's domains/IPs

## Prevention

- API keys are now loaded exclusively from `.env` (which is in `.gitignore`)
- `GoogleCloudVisionConfig.js` defaults to `null` when no env variable is set
- No hardcoded fallback keys exist in the codebase
