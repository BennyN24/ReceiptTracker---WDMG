const API_CONFIG = {
  development: {
    baseUrl: 'http://localhost:3000',
  },
  production: {
    baseUrl: 'receipt-tracker-pi.vercel.app',
  },
};

const ENV = __DEV__ ? 'development' : 'production';

export const API_BASE_URL = API_CONFIG[ENV].baseUrl;

export const API_ENDPOINTS = {
  geminiAnalyze: `${API_BASE_URL}/api/gemini-analyze`,
  googleVisionOcr: `${API_BASE_URL}/api/google-vision-ocr`,
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
