import type { ApiEndpoints } from '../types';

const LOCAL_API_BASE = 'http://192.168.1.100:3000';
const PROD_API_BASE = 'https://receipt-tracker-pi.vercel.app';

// Toggle between local and production
const API_BASE: string = PROD_API_BASE;

export const API_ENDPOINTS: ApiEndpoints = {
  geminiAnalyze: `${API_BASE}/api/gemini-analyze`,
  googleVisionOcr: `${API_BASE}/api/google-vision-ocr`,
};

export default API_ENDPOINTS;
