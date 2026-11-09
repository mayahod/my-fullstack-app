import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5039';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  use: {
    baseURL,
    browserName: 'chromium',
    channel: process.env.E2E_CHROMIUM_CHANNEL || undefined,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node server/server.js',
    url: baseURL + '/api/health',
    env: {
      NODE_ENV: 'production',
      CLIENT_URL: baseURL,
      PORT: '5039',
      MONGO_URI: process.env.E2E_MONGO_URI || 'mongodb://127.0.0.1:27017/recipes_e2e',
      JWT_SECRET: 'browser-tests-only',
      GEMINI_API_KEY: '',
      RENDER: '',
    },
  },
});
