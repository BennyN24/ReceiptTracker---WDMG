/**
 * Google Cloud Vision API Configuration
 *
 * SECURITY NOTE: The API key MUST be provided via the GOOGLE_CLOUD_API_KEY
 * environment variable. Never hardcode API keys in source code.
 *
 * For production deployments, consider routing OCR requests through a backend
 * proxy server to keep the API key entirely server-side and prevent abuse.
 */

interface VisionRequest {
  requests: Array<{
    image: { content: string };
    features: Array<{ type: string; maxResults: number }>;
    imageContext: { languageHints: string[] };
  }>;
}

interface Headers {
  'Content-Type': string;
}

const GoogleCloudVisionConfig = {
  apiKey: (process.env.GOOGLE_CLOUD_API_KEY as string | undefined) || null,
  endpoint: 'https://vision.googleapis.com/v1/images:annotate',

  getHeaders(): Headers {
    return {
      'Content-Type': 'application/json',
    };
  },

  buildRequest(base64ImageData: string): VisionRequest {
    return {
      requests: [
        {
          image: {
            content: base64ImageData,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 10,
            },
            {
              type: 'DOCUMENT_TEXT_DETECTION',
              maxResults: 10,
            },
          ],
          imageContext: {
            languageHints: ['en'],
          },
        },
      ],
    };
  },

  getUrl(): string | null {
    if (!this.apiKey) {
      console.warn(
        'Google Cloud Vision API key is not configured. ' +
        'Set GOOGLE_CLOUD_API_KEY in your .env file.'
      );
      return null;
    }
    return `${this.endpoint}?key=${this.apiKey}`;
  },

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  },
};

export default GoogleCloudVisionConfig;
