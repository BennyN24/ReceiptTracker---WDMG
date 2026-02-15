// To test against a local backend, set USE_LOCAL_API to true
// and update LOCAL_API_URL to your machine's LAN IP (not localhost).
// e.g. 'http://192.168.1.9:3000'
const USE_LOCAL_API = false;
const LOCAL_API_URL = 'http://192.168.1.9:3000';
const PRODUCTION_API_URL = 'https://receipt-tracker-pi.vercel.app';

export const API_BASE_URL = USE_LOCAL_API ? LOCAL_API_URL : PRODUCTION_API_URL;

export const API_ENDPOINTS = {
  geminiAnalyze: `${API_BASE_URL}/api/gemini-analyze`,
  googleVisionOcr: `${API_BASE_URL}/api/google-vision-ocr`,
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
