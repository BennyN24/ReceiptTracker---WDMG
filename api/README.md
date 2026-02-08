# ReceiptTracker Backend API

Secure backend proxy for ReceiptTracker mobile app that handles AI service API calls.

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your API keys

# Start development server
npm run dev
```

Server runs at `http://localhost:3000`

### Deploy to Production

```bash
# Login to Vercel
vercel login

# Add secrets
vercel secrets add gemini-api-key YOUR_KEY
vercel secrets add google-cloud-vision-api-key YOUR_KEY

# Deploy
vercel --prod
```

## API Endpoints

- `POST /api/gemini-analyze` - Analyze receipts with Gemini AI
- `POST /api/google-vision-ocr` - Extract text with Google Cloud Vision

## Documentation

See [BACKEND_DEPLOYMENT.md](../docs/BACKEND_DEPLOYMENT.md) for complete deployment guide.

## Environment Variables

- `GEMINI_API_KEY` - Google Gemini API key
- `GOOGLE_CLOUD_VISION_API_KEY` - Google Cloud Vision API key

## Tech Stack

- **Runtime**: Node.js (Vercel Serverless Functions)
- **Deployment**: Vercel
- **APIs**: Google Gemini AI, Google Cloud Vision
