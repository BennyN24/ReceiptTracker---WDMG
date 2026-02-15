# Backend API Deployment - Quick Start

## What Was Implemented

Your ReceiptTracker app now uses a **secure backend proxy** to protect API keys. The architecture is:

```
Mobile App → Vercel Backend → AI Services (Gemini/Google Cloud Vision)
```

## Files Created

### Backend API (`/api` directory)
- `api/gemini-analyze.js` - Gemini AI proxy endpoint
- `api/google-vision-ocr.js` - Google Cloud Vision proxy endpoint
- `api/package.json` - Backend dependencies
- `api/vercel.json` - Vercel deployment configuration
- `api/.env.example` - Environment variable template

### Mobile App Updates
- `src/config/api.js` - API endpoint configuration
- `src/services/GeminiService.js` - Updated to use backend proxy
- `src/services/OCRService.js` - Updated to use backend proxy

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Setup Backend
```bash
cd api
npm install
```

### 3. Add API Keys to Vercel
```bash
vercel login
vercel secrets add gemini-api-key YOUR_GEMINI_KEY
vercel secrets add google-cloud-vision-api-key YOUR_GOOGLE_VISION_KEY
```

### 4. Deploy to Vercel
```bash
vercel --prod
```

Copy the deployment URL (e.g., `https://your-app.vercel.app`)

### 5. Update Mobile App Config
Edit `src/config/api.js`:
```javascript
production: {
  baseUrl: 'https://your-app.vercel.app', // Replace with your URL
},
```

### 6. Test Your App
```bash
cd ..
npm start
```

## Local Testing (Optional)

Create `api/.env`:
```
GEMINI_API_KEY=your_key
GOOGLE_CLOUD_VISION_API_KEY=your_key
```

Run local server:
```bash
cd api
npm run dev
```

## What Changed

**Before:**
- API keys hardcoded in mobile app (insecure)
- Keys exposed in app bundle
- No rate limiting control

**After:**
- ✅ API keys stored securely on Vercel
- ✅ Server-side rate limiting
- ✅ Keys never exposed to users
- ✅ Easy to rotate keys without app update

## Next Steps

1. Deploy backend to Vercel
2. Update mobile app config with your Vercel URL
3. Test receipt scanning functionality
4. Monitor usage in Vercel dashboard

## Support

- Full documentation: `docs/BACKEND_DEPLOYMENT.md`
- Vercel docs: https://vercel.com/docs
- Issues? Check Vercel logs: `vercel logs`
