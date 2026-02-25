import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const RATE_LIMIT_MAX_REQUESTS = 8;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
// WARNING: In-memory rate limiting is unreliable on serverless platforms (cold starts and multiple instances).
// For production use, consider using a shared store like Upstash Redis or Vercel Edge Middleware rate limiting.
const requestTracker = new Map<string, number[]>();

const isRateLimited = (clientId: string) => {
  const now = Date.now();
  const requests = requestTracker.get(clientId) || [];
  const recentRequests = requests.filter(timestamp => timestamp > now - RATE_LIMIT_WINDOW_MS);
  requestTracker.set(clientId, recentRequests);
  return recentRequests.length >= RATE_LIMIT_MAX_REQUESTS;
};

const recordRequest = (clientId: string) => {
  const requests = requestTracker.get(clientId) || [];
  requests.push(Date.now());
  requestTracker.set(clientId, requests);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const clientId = (req.headers['x-client-id'] as string) || (req.headers['x-forwarded-for'] as string) || 'anonymous';

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
      contents: [
        {
          parts: [
            {
              text: `You are a receipt analysis expert. Analyze this receipt image and extract the following information in JSON format. Be precise and accurate.

Return ONLY a valid JSON object with these fields:
{
  "vendor": "Store or business name (string)",
  "amount": total amount as a number (e.g. 25.99),
  "date": "date in YYYY-MM-DD format (string)",
  "currency": "3-letter currency code like USD, EUR, PHP etc.",
  "items": [
    {
      "name": "item name (string)",
      "price": price as a number,
      "quantity": quantity as a number
    }
  ],
  "description": "Brief summary of the purchase (string)",
  "category": "One of: Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Education, Other",
  "tax": tax amount as a number or null,
  "subtotal": subtotal amount as a number or null,
  "paymentMethod": "Cash, Credit Card, Debit Card, or other method if visible",
  "confidence": confidence score from 0.0 to 1.0 indicating how confident you are in the extraction
}

Important rules:
- If a field cannot be determined, use null for numbers and empty string "" for strings
- The "amount" should be the TOTAL amount paid (including tax)
- Items array can be empty if individual items are not readable
- Date should be extracted from the receipt, not today's date, unless no date is visible
- Be conservative with confidence score
- Return ONLY the JSON object, no markdown, no explanation, no code blocks`,
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
    };

    const response = await fetch(`${GEMINI_API_BASE_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error ${response.status}:`, errorText);
      return res.status(response.status).json({ error: 'Gemini API error', details: errorText });
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
