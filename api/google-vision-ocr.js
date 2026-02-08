const GOOGLE_CLOUD_VISION_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;
const GOOGLE_CLOUD_VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`;

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const requestTracker = new Map();

const isRateLimited = (clientId) => {
  const now = Date.now();
  const requests = requestTracker.get(clientId) || [];
  const recentRequests = requests.filter(timestamp => timestamp > now - RATE_LIMIT_WINDOW_MS);
  requestTracker.set(clientId, recentRequests);
  return recentRequests.length >= RATE_LIMIT_MAX_REQUESTS;
};

const recordRequest = (clientId) => {
  const requests = requestTracker.get(clientId) || [];
  requests.push(Date.now());
  requestTracker.set(clientId, requests);
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Client-ID');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GOOGLE_CLOUD_VISION_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const clientId = req.headers['x-client-id'] || req.headers['x-forwarded-for'] || 'anonymous';

  if (isRateLimited(clientId)) {
    return res.status(429).json({ 
      error: 'rate_limited', 
      message: 'Too many requests. Please wait a moment and try again.' 
    });
  }

  try {
    const { base64Image } = req.body;

    if (!base64Image || typeof base64Image !== 'string') {
      return res.status(400).json({ error: 'Invalid request: base64Image is required' });
    }

    recordRequest(clientId);

    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1,
            },
          ],
        },
      ],
    };

    const response = await fetch(GOOGLE_CLOUD_VISION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Cloud Vision API error ${response.status}:`, errorText);
      return res.status(response.status).json({ error: 'Google Cloud Vision API error', details: errorText });
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Google Cloud Vision OCR error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
