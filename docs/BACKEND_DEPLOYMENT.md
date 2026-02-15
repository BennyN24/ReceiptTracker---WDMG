# Backend API Deployment Guide

This guide explains how to deploy the ReceiptTracker backend API proxy to Vercel for production use.

## Overview

The backend API acts as a secure proxy between your mobile app and external AI services (Gemini AI and Google Cloud Vision). This architecture keeps your API keys secure on the server side and prevents them from being exposed in the mobile app bundle.

## Architecture

```
Mobile App → Vercel Backend API → AI Services (Gemini/Google Cloud Vision)
```

**Benefits:**
- ✅ API keys never exposed in mobile app
- ✅ Server-side rate limiting
- ✅ Usage tracking and monitoring
- ✅ Easy to update API keys without app redeployment
- ✅ Additional security layer

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **API Keys**:
   - Gemini API Key: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Google Cloud Vision API Key: Get from [Google Cloud Console](https://console.cloud.google.com)

## Deployment Steps

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Navigate to API Directory

```bash
cd api
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Create Local Environment File

Create `api/.env` file (for local testing):

```bash
GEMINI_API_KEY=your_actual_gemini_api_key_here
GOOGLE_CLOUD_VISION_API_KEY=your_actual_google_cloud_vision_key_here
```

**Important**: Never commit this file to git (already in `.gitignore`)

### Step 5: Test Locally (Optional)

```bash
npm run dev
```

This starts a local development server at `http://localhost:3000`

Test endpoints:
- `http://localhost:3000/api/gemini-analyze`
- `http://localhost:3000/api/google-vision-ocr`

### Step 6: Login to Vercel

```bash
vercel login
```

### Step 7: Add Environment Variables to Vercel

```bash
# Add Gemini API Key
vercel secrets add gemini-api-key your_actual_gemini_api_key_here

# Add Google Cloud Vision API Key
vercel secrets add google-cloud-vision-api-key your_actual_google_cloud_vision_key_here
```

**Note**: Secrets are encrypted and stored securely on Vercel.

### Step 8: Deploy to Vercel

```bash
# Deploy to production
vercel --prod
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? Select your account
- Link to existing project? **No** (first time)
- Project name? **receipttracker-api** (or your preferred name)
- Directory? **./api**
- Override settings? **No**

### Step 9: Get Your Deployment URL

After deployment, Vercel will provide a URL like:
```
https://receipttracker-api.vercel.app
```

Copy this URL - you'll need it for the mobile app configuration.

### Step 10: Update Mobile App Configuration

Edit `src/config/api.js` in your mobile app:

```javascript
const API_CONFIG = {
  development: {
    baseUrl: 'http://localhost:3000', // For local testing
  },
  production: {
    baseUrl: 'https://your-vercel-app.vercel.app', // Replace with your URL
  },
};
```

Replace `https://your-vercel-app.vercel.app` with your actual Vercel deployment URL.

### Step 11: Rebuild Mobile App

```bash
# In the root directory
npm start
```

## API Endpoints

### POST /api/gemini-analyze

Analyzes receipt images using Gemini AI.

**Request:**
```json
{
  "base64Image": "base64_encoded_image_data"
}
```

**Headers:**
```
Content-Type: application/json
X-Client-ID: unique_client_identifier
```

**Response:**
```json
{
  "vendor": "Store Name",
  "amount": 25.99,
  "date": "2026-02-08",
  "currency": "USD",
  "items": [...],
  "category": "Food & Dining",
  "confidence": 0.85
}
```

### POST /api/google-vision-ocr

Extracts text from receipt images using Google Cloud Vision.

**Request:**
```json
{
  "base64Image": "base64_encoded_image_data"
}
```

**Headers:**
```
Content-Type: application/json
X-Client-ID: unique_client_identifier
```

**Response:**
```json
{
  "responses": [
    {
      "textAnnotations": [
        {
          "description": "extracted text from receipt"
        }
      ]
    }
  ]
}
```

## Rate Limiting

Both endpoints implement server-side rate limiting:
- **Gemini**: 8 requests per 60 seconds per client
- **Google Vision**: 10 requests per 60 seconds per client

Rate limit exceeded response (429):
```json
{
  "error": "rate_limited",
  "message": "Too many requests. Please wait a moment and try again."
}
```

## Monitoring & Logs

### View Deployment Logs

```bash
vercel logs
```

### View Real-time Logs

```bash
vercel logs --follow
```

### Vercel Dashboard

Visit [vercel.com/dashboard](https://vercel.com/dashboard) to:
- Monitor API usage
- View error logs
- Check performance metrics
- Manage environment variables

## Updating API Keys

If you need to update your API keys:

```bash
# Remove old secret
vercel secrets rm gemini-api-key

# Add new secret
vercel secrets add gemini-api-key new_api_key_here

# Redeploy
vercel --prod
```

## Redeployment

To redeploy after making changes:

```bash
cd api
vercel --prod
```

## Custom Domain (Optional)

To use a custom domain:

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `api.receipttracker.com`)
3. Update DNS records as instructed
4. Update `src/config/api.js` with your custom domain

## Troubleshooting

### Error: "API key not configured"

**Solution**: Ensure secrets are properly added to Vercel:
```bash
vercel secrets ls
```

Should show:
- `gemini-api-key`
- `google-cloud-vision-api-key`

### Error: "CORS issues"

**Solution**: The API already includes CORS headers. If issues persist, check that you're using the correct Vercel URL.

### Error: "Rate limit exceeded"

**Solution**: This is expected behavior. Wait 60 seconds and try again. Consider implementing client-side caching or reducing scan frequency.

### Local testing not working

**Solution**: 
1. Ensure `.env` file exists in `api/` directory
2. Run `npm install` in `api/` directory
3. Start dev server: `npm run dev`

## Security Best Practices

1. ✅ Never commit API keys to git
2. ✅ Use Vercel secrets for production keys
3. ✅ Rotate API keys periodically
4. ✅ Monitor API usage in Vercel dashboard
5. ✅ Keep different keys for development and production
6. ✅ Enable API key restrictions in Google Cloud Console

## Cost Estimates

### Vercel (Hobby Plan - Free)
- ✅ 100GB bandwidth/month
- ✅ Unlimited API requests
- ✅ Serverless function executions

### Gemini API (Free Tier)
- ✅ 60 requests per minute
- ✅ 1,500 requests per day

### Google Cloud Vision (Free Tier)
- ✅ 1,000 requests per month
- ✅ $1.50 per 1,000 requests after

**Estimated monthly cost for 1,000 users**: $0-20

## Support

For issues or questions:
- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Gemini API Docs: [ai.google.dev](https://ai.google.dev)
- Google Cloud Vision Docs: [cloud.google.com/vision](https://cloud.google.com/vision)

## Next Steps

After deployment:
1. ✅ Test both endpoints with real receipt images
2. ✅ Monitor logs for any errors
3. ✅ Set up alerts in Vercel dashboard
4. ✅ Consider adding analytics/monitoring (e.g., Sentry)
5. ✅ Document your production URL for team members
