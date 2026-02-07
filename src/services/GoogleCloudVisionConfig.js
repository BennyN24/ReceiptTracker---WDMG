const GoogleCloudVisionConfig = {
  apiKey: process.env.GOOGLE_CLOUD_API_KEY || 'AIzaSyBbUbzsZYbG7IhB9APCtIM6Kn2qDQ0-8mQ',
  endpoint: 'https://vision.googleapis.com/v1/images:annotate',
  
  getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  },

  buildRequest(base64ImageData) {
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

  getUrl() {
    return `${this.endpoint}?key=${this.apiKey}`;
  },

  isConfigured() {
    return !!this.apiKey;
  },
};

export default GoogleCloudVisionConfig;
